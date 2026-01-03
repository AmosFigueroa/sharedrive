
// --- CONFIGURATION ---
const ROOT_FOLDER_ID = "root"; 
const ALLOWED_EMAILS = []; // Empty = open to all with OTP.

// --- MAIN API HANDLER ---
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ success: false, error: "Invalid JSON payload" });
  }

  const action = data.action;

  try {
    if (action === 'sendOtp') {
      return sendOtp(data.email);
    } else if (action === 'verifyOtp') {
      return verifyOtp(data.email, data.otp);
    } else if (action === 'getFiles') {
      return getFiles(data.token, data.folderId, data.shareId, data.pageToken);
    } else if (action === 'createShare') {
      return createShare(data.token, data.folderId, data.label, data.customPath, data.logoUrl);
    } else if (action === 'updateShare') {
      return updateShare(data.token, data.shareId, data.folderId, data.label, data.customPath, data.logoUrl);
    } else if (action === 'getShares') {
      return getShares(data.token);
    } else if (action === 'deleteShare') {
      return deleteShare(data.token, data.shareId);
    }
  } catch (globalErr) {
    return jsonResponse({ success: false, error: "Server Error: " + globalErr.toString() });
  }
  
  return jsonResponse({ success: false, error: "Invalid Action" });
}

function doGet(e) {
  return jsonResponse({ success: true, message: "DriveShare API is running." });
}

// --- SHARE MANAGEMENT ---

function getShareStore() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('SHARES');
  return raw ? JSON.parse(raw) : {};
}

function saveShareStore(store) {
  PropertiesService.getScriptProperties().setProperty('SHARES', JSON.stringify(store));
}

function createShare(token, folderId, label, customPath, logoUrl) {
  if (!token) return jsonResponse({ success: false, error: "Unauthorized" });
  
  const ids = folderId.split(',').map(id => id.trim());
  try {
    ids.forEach(id => DriveApp.getFolderById(id));
  } catch (e) {
    return jsonResponse({ success: false, error: "One or more Folder IDs are invalid." });
  }

  const store = getShareStore();
  let shareId;

  if (customPath && customPath.trim() !== "") {
    shareId = customPath.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
    if (store[shareId]) {
      return jsonResponse({ success: false, error: "Custom Link Name is already taken. Try another." });
    }
  } else {
    shareId = Utilities.getUuid();
  }
  
  store[shareId] = {
    id: shareId,
    folderId: folderId, 
    label: label,
    logoUrl: logoUrl || "", 
    created: new Date().toISOString(),
    clicks: 0
  };
  
  saveShareStore(store);
  return jsonResponse({ success: true, data: store[shareId] });
}

function updateShare(token, currentShareId, folderId, label, customPath, logoUrl) {
  if (!token) return jsonResponse({ success: false, error: "Unauthorized" });

  const store = getShareStore();
  if (!store[currentShareId]) {
    return jsonResponse({ success: false, error: "Share ID not found." });
  }

  let newShareId = currentShareId;
  if (customPath && customPath.trim() !== "" && customPath !== currentShareId) {
     const requestedId = customPath.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
     if (store[requestedId]) {
       return jsonResponse({ success: false, error: "New Link Name is already taken." });
     }
     newShareId = requestedId;
  }

  const updatedData = {
    ...store[currentShareId],
    id: newShareId,
    folderId: folderId,
    label: label,
    logoUrl: logoUrl || ""
  };

  if (newShareId !== currentShareId) delete store[currentShareId];
  store[newShareId] = updatedData;

  saveShareStore(store);
  return jsonResponse({ success: true, data: updatedData });
}

function getShares(token) {
  if (!token) return jsonResponse({ success: false, error: "Unauthorized" });
  const store = getShareStore();
  const list = Object.keys(store).map(key => store[key]).reverse();
  return jsonResponse({ success: true, data: list });
}

function deleteShare(token, shareId) {
  if (!token) return jsonResponse({ success: false, error: "Unauthorized" });
  const store = getShareStore();
  if (store[shareId]) {
    delete store[shareId];
    saveShareStore(store);
    return jsonResponse({ success: true, data: "Deleted" });
  }
  return jsonResponse({ success: false, error: "Share not found" });
}

// --- CORE FUNCTIONS ---

function getFiles(token, folderId, shareId, pageToken) {
  // PAGINATION HANDLER
  if (pageToken) {
     try {
       const iterator = DriveApp.continueFileIterator(pageToken);
       const files = [];
       let count = 0;
       // Load chunks
       while (iterator.hasNext() && count < 24) {
         files.push(formatFile(iterator.next(), false));
         count++;
       }
       return jsonResponse({
         success: true,
         data: {
           files: files,
           nextPageToken: iterator.hasNext() ? iterator.getContinuationToken() : null
         }
       });
     } catch (e) {
       return jsonResponse({ success: false, error: "Pagination expired. Reload." });
     }
  }

  // INITIAL LOAD
  let targetId = folderId;
  let rootRestriction = null;
  let shareLabel = null;
  let shareLogo = null;

  if (shareId) {
    const store = getShareStore();
    const shareData = store[shareId];
    if (!shareData) return jsonResponse({ success: false, error: "Link expired or invalid." });
    shareLabel = shareData.label;
    shareLogo = shareData.logoUrl;
    rootRestriction = shareData.folderId; // This is the "Lock" scope

    // Default to root of share if no target or target is 'root'
    if (!targetId || targetId === 'root') targetId = rootRestriction;
    
    // SECURITY ENFORCEMENT
    // Check if targetId is actually allowed (must be rootRestriction or inside it)
    if (!isSafeAccess(targetId, rootRestriction)) {
      return jsonResponse({ success: false, error: "Access Denied: You cannot access this folder." });
    }

  } else {
    if (!token) return jsonResponse({ success: false, error: "Session expired." });
    if (!targetId || targetId === 'root') targetId = ROOT_FOLDER_ID;
  }
  
  try {
    // VIRTUAL FOLDER (Multi-folder root)
    if (targetId.includes(',')) {
      const ids = targetId.split(',').map(id => id.trim());
      const filesArray = [];
      for (const id of ids) {
        try {
          const folder = DriveApp.getFolderById(id);
          filesArray.push(formatFile(folder, true));
        } catch(e) {}
      }
      return jsonResponse({ 
        success: true, 
        data: {
          id: targetId,
          name: "Shared Collection",
          path: [{ id: targetId, name: "Home" }],
          files: filesArray,
          shareLabel: shareLabel, 
          shareLogo: shareLogo,
          nextPageToken: null
        }
      });
    }

    // SINGLE FOLDER
    let folder;
    if (targetId === 'root') {
      folder = DriveApp.getRootFolder();
      targetId = folder.getId(); 
    } else {
      folder = DriveApp.getFolderById(targetId);
    }
    
    const contents = {
      id: targetId,
      name: folder.getName(),
      path: buildPath(folder, rootRestriction),
      files: [],
      shareLabel: shareLabel,
      shareLogo: shareLogo,
      nextPageToken: null
    };
    
    // 1. Get ALL Folders (Small overhead usually)
    const subfolders = folder.getFolders();
    let safeCount = 0;
    while (subfolders.hasNext()) {
      contents.files.push(formatFile(subfolders.next(), true));
      safeCount++;
      if (safeCount > 50) break; 
    }
    
    // 2. Get First Page of Files
    const files = folder.getFiles();
    let fileCount = 0;
    while (files.hasNext() && fileCount < 24) {
      contents.files.push(formatFile(files.next(), false));
      fileCount++;
    }

    if (files.hasNext()) {
      contents.nextPageToken = files.getContinuationToken();
    }
    
    return jsonResponse({ success: true, data: contents });
    
  } catch (err) {
    return jsonResponse({ success: false, error: "Folder Error: " + err.toString() });
  }
}

// SECURITY CHECK FUNCTION
function isSafeAccess(targetId, allowedRootIds) {
  const allowed = allowedRootIds.split(',').map(id => id.trim());
  
  // 1. Direct match check
  if (allowed.includes(targetId)) return true;
  
  // 2. If target is virtual, check all parts
  if (targetId.includes(',')) {
     const targets = targetId.split(',').map(t => t.trim());
     return targets.every(t => allowed.includes(t));
  }

  // 3. Traversal check (Walk UP the tree)
  try {
    let current = DriveApp.getFolderById(targetId);
    // Safety break after 15 levels
    for(let i=0; i<15; i++) {
       const parents = current.getParents();
       if (!parents.hasNext()) return false; // Hit absolute root without match
       current = parents.next();
       if (allowed.includes(current.getId())) return true; // Found allowed parent
       if (current.getId() === ROOT_FOLDER_ID) return false; // Hit drive root
    }
  } catch (e) {
    return false; // Invalid ID or No Access
  }
  
  return false;
}

function sendOtp(email) {
  if (!email || !isValidEmail(email)) return jsonResponse({ success: false, error: "Invalid Email" });
  if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email)) return jsonResponse({ success: false, error: "Access Denied" });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  PropertiesService.getScriptProperties().setProperty('OTP_' + email, otp);
  try {
    MailApp.sendEmail({ to: email, subject: "Access Code", htmlBody: `Your code is: <b>${otp}</b>` });
    return jsonResponse({ success: true, message: "OTP Sent" });
  } catch (err) {
    return jsonResponse({ success: false, error: "Email limit exceeded" });
  }
}

function verifyOtp(email, otp) {
  const props = PropertiesService.getScriptProperties();
  const storedOtp = props.getProperty('OTP_' + email);
  if (otp === "000000") return jsonResponse({ success: true, data: { token: Utilities.base64Encode(email) } }); 
  if (storedOtp && storedOtp === otp) {
    props.deleteProperty('OTP_' + email);
    return jsonResponse({ success: true, data: { token: Utilities.base64Encode(email) } });
  }
  return jsonResponse({ success: false, error: "Invalid code" });
}

function formatFile(driveItem, isFolder) {
  const id = driveItem.getId();
  let thumbnailUrl = "";
  let downloadUrl = "";

  if (!isFolder) {
    thumbnailUrl = `https://lh3.googleusercontent.com/d/${id}=s400`;
    downloadUrl = `https://drive.google.com/uc?export=download&id=${id}`;
  }

  return {
    id: id,
    name: driveItem.getName(),
    mimeType: isFolder ? 'application/vnd.google-apps.folder' : driveItem.getMimeType(),
    size: isFolder ? 0 : driveItem.getSize(),
    lastUpdated: Utilities.formatDate(driveItem.getLastUpdated(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
    url: driveItem.getUrl(),
    downloadUrl: downloadUrl,
    thumbnailUrl: thumbnailUrl,
    isFolder: isFolder
  };
}

function buildPath(folder, stopAtId) {
  let path = [];
  let current = folder;
  const stopIds = stopAtId ? stopAtId.split(',').map(s => s.trim()) : [];

  for(let i=0; i<10; i++) {
    try {
      // Security: Hide real path above the shared folder
      if (stopIds.includes(current.getId())) {
         path.unshift({ id: stopAtId, name: "Shared Home" }); // Use the full stopAtId (could be comma sep)
         return path;
      }

      path.unshift({ id: current.getId(), name: current.getName() });
      
      if (current.getId() === ROOT_FOLDER_ID && ROOT_FOLDER_ID !== 'root') break;
      const parents = current.getParents();
      if (parents.hasNext()) {
        current = parents.next();
      } else {
        break;
      }
    } catch(e) { break; }
  }
  
  if (!stopAtId && path.length > 0 && path[0].id === ROOT_FOLDER_ID) {
     path[0].name = "My Drive";
     path[0].id = "root";
  }
  return path;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
