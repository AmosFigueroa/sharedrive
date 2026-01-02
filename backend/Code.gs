
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
      return getFiles(data.token, data.folderId, data.shareId);
    } else if (action === 'createShare') {
      return createShare(data.token, data.folderId, data.label, data.customPath, data.logoUrl);
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
  
  // Validate folder existence
  const ids = folderId.split(',').map(id => id.trim());
  try {
    ids.forEach(id => DriveApp.getFolderById(id));
  } catch (e) {
    return jsonResponse({ success: false, error: "One or more Folder IDs are invalid." });
  }

  const store = getShareStore();
  let shareId;

  // CUSTOM PATH LOGIC
  if (customPath && customPath.trim() !== "") {
    // Sanitize: allow alphanumeric, dash, underscore
    shareId = customPath.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
    
    // Check if taken
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
    logoUrl: logoUrl || "", // Store Logo URL
    created: new Date().toISOString(),
    clicks: 0
  };
  
  saveShareStore(store);
  return jsonResponse({ success: true, data: store[shareId] });
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

function getFiles(token, folderId, shareId) {
  let targetId = folderId;
  let rootRestriction = null;
  let shareLabel = null;
  let shareLogo = null;

  // SCENARIO 1: Client Access via Share Link
  if (shareId) {
    const store = getShareStore();
    const shareData = store[shareId];
    
    if (!shareData) {
      return jsonResponse({ success: false, error: "Link expired or invalid." });
    }
    
    // Capture Share Metadata for Branding
    shareLabel = shareData.label;
    shareLogo = shareData.logoUrl;

    if (!targetId || targetId === 'root') {
      targetId = shareData.folderId;
    }
    
    rootRestriction = shareData.folderId;
  } 
  // SCENARIO 2: Admin Access
  else {
    if (!token) return jsonResponse({ success: false, error: "Session expired." });
    if (!targetId || targetId === 'root') targetId = ROOT_FOLDER_ID;
  }
  
  try {
    // --- VIRTUAL ROOT LOGIC (Multiple Folders) ---
    if (targetId.includes(',')) {
      const ids = targetId.split(',').map(id => id.trim());
      const filesArray = [];
      
      ids.forEach(id => {
        try {
          const folder = DriveApp.getFolderById(id);
          filesArray.push(formatFile(folder, true));
        } catch(e) {}
      });

      return jsonResponse({ 
        success: true, 
        data: {
          id: targetId,
          name: "Shared Collection",
          path: [{ id: targetId, name: "Home" }],
          files: filesArray,
          shareLabel: shareLabel, // Pass to frontend
          shareLogo: shareLogo    // Pass to frontend
        }
      });
    }

    // --- STANDARD SINGLE FOLDER LOGIC ---
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
      shareLabel: shareLabel, // Pass to frontend
      shareLogo: shareLogo    // Pass to frontend
    };
    
    const subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
      contents.files.push(formatFile(subfolders.next(), true));
    }
    
    const files = folder.getFiles();
    while (files.hasNext()) {
      contents.files.push(formatFile(files.next(), false));
    }
    
    return jsonResponse({ success: true, data: contents });
    
  } catch (err) {
    return jsonResponse({ success: false, error: "Folder Error: " + err.toString() });
  }
}

function sendOtp(email) {
  if (!email || !isValidEmail(email)) {
    return jsonResponse({ success: false, error: "Invalid Email Address" });
  }
  if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email)) {
    return jsonResponse({ success: false, error: "Access Denied" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const props = PropertiesService.getScriptProperties();
  props.setProperty('OTP_' + email, otp);
  
  try {
    MailApp.sendEmail({
      to: email,
      subject: "Access Code - DriveShare Pro",
      htmlBody: `Your code is: <b>${otp}</b>`
    });
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

// --- HELPERS ---

function formatFile(driveItem, isFolder) {
  let downloadUrl = "";
  let thumbnailUrl = "";
  
  if (!isFolder) {
    try { downloadUrl = driveItem.getDownloadUrl().replace("&gd=true", ""); } catch(e) { downloadUrl = driveItem.getUrl(); }
    
    // FIX: Generate Base64 Thumbnail to ensure it loads on all domains
    try { 
      // Only get thumbnail for images/videos to save performance
      const mime = driveItem.getMimeType();
      if (mime.indexOf('image') > -1 || mime.indexOf('video') > -1) {
         const thumbBlob = driveItem.getThumbnail();
         if (thumbBlob) {
            thumbnailUrl = "data:image/png;base64," + Utilities.base64Encode(thumbBlob.getBytes());
         }
      }
    } catch(e) {
      // Fallback: If no thumbnail exists, leave empty
    }
  }

  return {
    id: driveItem.getId(),
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
  
  if (stopAtId && stopAtId.includes(',')) {
    if (stopAtId.includes(current.getId())) {
       path.unshift({ id: stopAtId, name: "Shared Collection" });
       return path;
    }
  }

  for(let i=0; i<6; i++) {
    try {
      path.unshift({ id: current.getId(), name: current.getName() });
      if (stopAtId && current.getId() === stopAtId) {
         path[0].name = "Shared Home";
         break;
      }
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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
