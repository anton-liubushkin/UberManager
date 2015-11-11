var fs = require('fs'),
    path = require('path'),
    remote = require('remote'),
    app = remote.require('app'),
    os = remote.require('os'),
    dialog = remote.require('dialog'),
    ncp = require('ncp').ncp,
    rimraf = require('rimraf'),
    xml2js = require('xml2js'),
    unzip = require('unzip'),
    mkdirp = require('mkdirp'),
    glob = require("glob"),
    _osType = os.type(),
    _osPlatform = os.platform(),
    _osArch = os.arch(),
    _dirHome = app.getPath('home'), // C:/Users/Anton
    _dirAppdata = app.getPath('appData'), // C:/Users/Anton/AppData/Roaming || ~/Library/Application Support
    _dirTemp = app.getPath('temp'), // C:/Users/Anton/AppData/Local/Temp
    _dirDesktop = app.getPath('userDesktop'), // C:/Users/Anton/Desktop
    _dirApplications = path.join(_dirHome, '..', '..', 'Program Files (x86)'),
    _dirCommonFiles = null,
    extensionsList = [],
    extensionsDirectoriesList = [],
    totalExtensions = 0,
    currentExtensions = 0,
    parser = new xml2js.Parser(),
    xmlObj = null,
    removeButtons = [],
    msgtimer,
    ignoreList = ["com.adobe.DesignLibraries.angular", "AdobeExchange", "com.adobe.behance.shareonbehance.html", "KulerPanelBundle", "SearchForHelp", "com.adobe.preview", "com.adobe.webpa.crema"];

parser.addListener('end', function(result) {
    xmlObj = result;
});

function getDirectories(srcpath, callback) {
    for (i in srcpath) {
        //console.log("Check " + Number(Number(i) + 1) + " of " + srcpath.length + "\n" + srcpath[i])
        if (exists(srcpath[i])) {
            var files = fs.readdirSync(srcpath[i]);
            files.forEach(function(file) {
                if (fs.statSync(path.join(srcpath[i], file)).isDirectory()) {
                    //console.log('Find a extension: ' + file);
                    if (ignoreList.indexOf(file) < 0) {
                        extensionsDirectoriesList.push(path.join(srcpath[i], file));
                    }
                }
            });
            if (srcpath.length == Number(i) + 1 && callback && typeof(callback) === "function") {
                callback('Done!');
            }
        }
    }
}

function exists(_path, make) {
    make = make || false;
    try {
        fs.accessSync(_path);
        if (make) {
            return _path
        } else {
            return true;
        }
    } catch (ex) {
        if (make) {
            mkdirp(_path, function(err){
                if (!err) {
                    return _path;
                } else {
                    console.log(err);
                    return null;
                }
            });
        } else {
            return false;
        }
    }
}

function getExtensionInfo(_extensiondir, newInstall) {
    fs.readFile(path.join(_extensiondir, 'CSXS', 'manifest.xml'), function(err, data) {
        //console.log('Get info for ' + path);
        try {
            parser.parseString(data);
            var ext = {};
            ext.name = xmlObj.ExtensionManifest.$.ExtensionBundleName || xmlObj.ExtensionManifest.$.ExtensionBundleId; // Extension Name
            ext.id = xmlObj.ExtensionManifest.$.ExtensionBundleId;
            ext.path = _extensiondir;
            ext.ver = xmlObj.ExtensionManifest.$.ExtensionBundleVersion;
            ext.cep = Math.floor(xmlObj.ExtensionManifest.ExecutionEnvironment[0].RequiredRuntimeList[0].RequiredRuntime[0].$.Version);
            var hostsList = xmlObj.ExtensionManifest.ExecutionEnvironment[0].HostList[0].Host;
            ext.hosts = [];
            for (i in hostsList) {
                ext.hosts.push(hostsList[i].$.Name);
            }
            ext.hosts.sort();

            if (newInstall) {
                installExtension(ext);
                return
            }

            extensionsList.push(ext);

            currentExtensions++;
            if (currentExtensions == totalExtensions && totalExtensions != 0) drawExtensionsList(extensionsList);
            //console.log(ext.hosts[i].$.Version.replace(/([\[\]])+/g, '').split(',')); // Supported Versions
            //console.log(xmlObj.ExtensionManifest.Author[0]); // Author
        } catch (e) {
            console.log('​/ ! \\ Error! Can not read manifest.xml file from: ' + _extensiondir);
            currentExtensions++;
            if (currentExtensions == totalExtensions && totalExtensions != 0) drawExtensionsList(extensionsList);
        }
    });
}


function updateExtensionsList() {

    resetVars();

    if (_osPlatform == "win32") {
        var winPaths = [];
        winPaths.push( exists( path.join(_dirCommonFiles, 'Adobe', 'CEPServiceManager4', 'extensions'), true) );
        winPaths.push( exists( path.join(_dirCommonFiles, 'Adobe', 'CEP', 'extensions'), true) );
        winPaths.push( exists( path.join(_dirAppdata, 'Adobe', 'CEPServiceManager4', 'extensions'), true) );
        winPaths.push( exists( path.join(_dirAppdata, 'Adobe', 'CEP', 'extensions'), true) );

        getDirectories(winPaths, function(msg) {
            totalExtensions = extensionsDirectoriesList.length;
            for (i in extensionsDirectoriesList) {
                getExtensionInfo(extensionsDirectoriesList[i]);
            }
        });

    } else {
        var macPaths = [];
        macPaths.push(exists('/Library/Application Support/Adobe/CEPServiceManager4/extensions', true));
        macPaths.push(exists('/Library/Application Support/Adobe/CEP/extensions', true));
        macPaths.push(exists(path.join(_dirAppdata, '/Adobe/CEPServiceManager4/extensions'), true));
        macPaths.push(exists(path.join(_dirAppdata, '/Adobe/CEP/extensions'), true));

        getDirectories(macPaths, function(msg) {
            totalExtensions = extensionsDirectoriesList.length;
            for (i in extensionsDirectoriesList) {
                getExtensionInfo(extensionsDirectoriesList[i]);
            }
        });
    }

}

function resetVars() {
    extensionsDirectoriesList = [];
    totalExtensions = 0;
    currentExtensions = 0;
    extensionsList = [];
}

function removeDirectories(paths, callback) {
    for (i in paths) {
        rimraf.sync(paths[i]);
    }
    if (callback) {
        callback();
    }
}

function installExtension(ext) {
    var listOfDirectroiesToRemove = [];
    var cep5installpath = path.join(_dirAppdata, 'Adobe', 'CEP', 'extensions', ext.id);
    var cep4installpath = path.join(_dirAppdata, 'Adobe', 'CEPServiceManager4', 'extensions', ext.id);

    function copyExtension(_installPath) {
        for (i in _installPath) {
            ncp(ext.path, _installPath[i], function(err) {
                if (!err) {
                    toggleMessageBox("success")
                    updateExtensionsList();
                } else {
                    toggleMessageBox("error", "Installation failed. Error: " + err);
                    console.log(err);
                }
            });
        }
    }

    function checkOldVersions(callback) {
        if (exists(cep5installpath)) listOfDirectroiesToRemove.push(cep5installpath);
        if (ext.cep < 5 && exists(cep4installpath)) listOfDirectroiesToRemove.push(cep4installpath);
        callback();
    }

    checkOldVersions(function() {
        var installPaths = [cep5installpath];
        if (ext.cep < 5) installPaths.push(cep4installpath);

        if (listOfDirectroiesToRemove.length > 0) {
            removeDirectories(listOfDirectroiesToRemove, function() {
                copyExtension(installPaths);
            });
        } else {
            copyExtension(installPaths);
        }
    });

}

function checkPlatform() {
    if (_osPlatform == 'win32') {
        if (exists(_dirApplications)) {
            _dirCommonFiles = path.join(_dirApplications, 'Common Files');
        } else {
            _dirCommonFiles = path.join(_dirHome, '..', '..', 'Program Files', 'Common Files');
            _dirApplications = path.join(_dirHome, '..', '..', 'Program Files');
        }
    } else {
        // Some code for MAC
    }

    updateExtensionsList();
}

checkPlatform();

// ========================================================
//
//
// Application UI
//
//
// ========================================================

document.getElementById('installzxp').onclick = function() {
    toggleMessageBox();
    var dialogFilter = {
        filters: [{
            name: 'Adobe Extension',
            extensions: ['zxp', 'zip']
        }]
    };

    dialog.showOpenDialog(dialogFilter, function(_f) {

        if (!_f) return

        toggleMessageBox("progress");

        startInstall(_f[0]);

        function startInstall(filepath) {

            var newfile = path.parse(filepath);

            if (newfile.ext != ".zxp" && newfile.ext != ".zip") {
                toggleMessageBox("error", "Cannot install this type of file. Please use a ZXP or ZIP file");
                return
            }

            var extractPath = path.join(_dirTemp, 'UberManager', newfile.name + '_' + Math.random().toString().substr(2,9));

            var readStream = fs.createReadStream(filepath);

            var unzipStream = unzip.Extract({
                path: extractPath
            });

            unzipStream.on('close', function() {
                // + support Davide Barranca PSInstall script & other unzipped extension
                var manifestFile = glob.sync('**/CSXS/manifest.xml', {cwd: extractPath});
                if (manifestFile.length == 1) {
                    extractPath = path.join(extractPath, manifestFile[0], '..', '..');
                    getExtensionInfo(extractPath, true);
                } else {
                    // + support multipack extensionons
                    var zxpFiles = glob.sync('**/*.zxp', {cwd: extractPath});
                    for (i in zxpFiles) {
                        startInstall(path.join(extractPath, zxpFiles[i]))
                    }
                }

            });
            unzipStream.on('end', function() {
                // Use on.('close'
                //getExtensionInfo(extractPath, true);
            });
            unzipStream.on('error', function(err) {
                toggleMessageBox("error", "Installation failed because UberManager could not parse the ZXP file");
                updateExtensionsList();
            });

            readStream.pipe(unzipStream);
        }

    });
}

function clearExtensionsList() {
    var myNode = document.getElementById("adobe-extensions-list");
    while (myNode.firstChild) {
        myNode.removeChild(myNode.firstChild);
    }
}

function drawExtensionsListElem(_extensionInfo) {
    function createImg(imgSrc, imgAlt) {
        var img = document.createElement("img");
        img.setAttribute("src", "img/" + imgSrc);
        img.setAttribute("alt", imgAlt);
        return img
    }

    var node = document.createElement("LI");
    var strong = document.createElement("STRONG");
    var textnode = document.createTextNode(_extensionInfo.name);
    var span1 = document.createElement("SPAN");
    var textVersion = span1.appendChild(document.createTextNode(_extensionInfo.ver));
    var span2 = document.createElement("SPAN");
    var removeIcon = createImg("icon_remove.png", "Remove extension");
    var hasPs = false;

    for (g in _extensionInfo.hosts) {
        if (_extensionInfo.hosts[g] == "PHSP" && hasPs == false || _extensionInfo.hosts[g] == "PHXS" && hasPs == false) {
            span2.appendChild(createImg("icon_ps.png", "Photoshop"));
            hasPs = true;
        }
        if (_extensionInfo.hosts[g] == "ILST") {
            span2.appendChild(createImg("icon_ai.png", "Illustrator"));
        }
        if (_extensionInfo.hosts[g] == "IDSN") {
            span2.appendChild(createImg("icon_id.png", "InDesign"));
        }
        if (_extensionInfo.hosts[g] == "PPRO") {
            span2.appendChild(createImg("icon_pr.png", "Premiere Pro"));
        }
        if (_extensionInfo.hosts[g] == "AEFT") {
            span2.appendChild(createImg("icon_ae.png", "After Effects"));
        }
        if (_extensionInfo.hosts[g] == "PRLD") {
            span2.appendChild(createImg("icon_pl.png", "Prelude"));
        }
        if (_extensionInfo.hosts[g] == "FLPR") {
            span2.appendChild(createImg("icon_fl.png", "Flash"));
        }
    }

    span1.className = "extension_version";
    span2.className = "extension_hosts";
    removeIcon.className = "extension_remove";
    removeIcon.setAttribute("data-path", _extensionInfo.path);

    strong.appendChild(textnode);
    node.appendChild(strong);
    node.appendChild(span1);
    node.appendChild(span2);
    node.appendChild(removeIcon);
    document.getElementById("adobe-extensions-list").appendChild(node);
};

function drawExtensionsList(extensionsList) {
    function removeDuplicateFromExtensionsList(extensionsList) {
        var exclude_ids = [];
        var new_list = [];

        for (var i = 0; i < extensionsList.length; i++) {
            if (exclude_ids.indexOf(i) == -1) {
                for (var j = (i + 1); j < extensionsList.length; j++) {
                    if (extensionsList[i].id == extensionsList[j].id) {
                        exclude_ids.push(j);
                        extensionsList[i].path += "," + extensionsList[j].path
                    }
                }
                new_list.push(extensionsList[i]);
            }
        }
        return new_list
    }

    extensionsList = removeDuplicateFromExtensionsList(extensionsList);

    extensionsList.sort(function(a, b) {
        if (a.name > b.name) {
            return 1;
        }
        if (a.name < b.name) {
            return -1;
        }
        return 0;
    });

    // console.log('Clear ext list');
    clearExtensionsList();

    for (i in extensionsList) {
        // console.log('Draw ext elem');
        drawExtensionsListElem(extensionsList[i]);
    }

    removeButtons = document.getElementsByClassName('extension_remove');

    for (var i = 0; i < removeButtons.length; i++) {
        removeButtons[i].addEventListener('click', clickOnRemoveIcon, false);
    }
};

function clickOnRemoveIcon() {
    toggleMessageBox("progress", "Uninstallation is in progress");
    var paths = (this.getAttribute("data-path")).split(",");

    removeDirectories(paths, function() {
        updateExtensionsList();
        toggleMessageBox("success", "Extension successfully uninstalled");
    })
}



function toggleMessageBox(type, message) {

    var message_box_wrapper = document.getElementById('message_box_wrapper');
    var message_box = document.getElementById('message_box');
    var installbtn = document.getElementById('installzxp');

    function hideMessageBox() {
        message_box_wrapper.style.opacity = "0";
        message_box.classList.remove("show");
    }

    if (type) {
        var msg_progress = document.getElementById('msg_progress');
        var msg_progress_text = document.getElementById('msg_progress_text');
        var msg_success = document.getElementById('msg_success');
        var msg_success_text = document.getElementById('msg_success_text');
        var msg_error = document.getElementById('msg_error');
        var msg_error_text = document.getElementById('msg_error_text');

        message_box_wrapper.style.opacity = "1";
        message_box.className = "show";

        msg_progress.style["display"] = "none";
        msg_success.style["display"] = "none";
        msg_error.style["display"] = "none";

        if (type == "progress") {
            clearTimeout(msgtimer);
            installbtn.disabled = true;
            msg_progress_text.innerHTML = message || "Installation is in progress";
            msg_progress.style["display"] = "block";
            message_box.className = message_box.className + " progress";
        }

        if (type == "success") {
            clearTimeout(msgtimer);
            installbtn.disabled = false;
            msg_success_text.innerHTML = message || "Extension successfully installed";
            msg_success.style["display"] = "block";
            message_box.className = message_box.className + " success";
            msgtimer = setTimeout(hideMessageBox, 3000);
        }

        if (type == "error") {
            clearTimeout(msgtimer);
            installbtn.disabled = false;
            msg_error_text.innerHTML = message || "Oops, unknown error";
            msg_error.style["display"] = "block";
            message_box.className = message_box.className + " error";
            msgtimer = setTimeout(hideMessageBox, 10000);
        }

    } else {
        clearTimeout(msgtimer);
        installbtn.disabled = false;
        hideMessageBox();
    }


}
