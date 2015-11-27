;

function init() {
    var _fs = require('fs'),
        _path = require('path'),
        _remote = require('remote'),
        _app = _remote.require('app'),
        _dirHome = _app.getPath('home'), // C:/Users/Anton
        _dirAppdata = _app.getPath('appData'), // C:/Users/Anton/AppData/Roaming || ~/Library/Application Support
        _dirTemp = _app.getPath('temp'), // C:/Users/Anton/AppData/Local/Temp
        _dirDesktop = _app.getPath('userDesktop'), // C:/Users/Anton/Desktop
        _os = _remote.require('os'),
        _osType = _os.type(),
        _osPlatform = _os.platform(),
        _osArch = _os.arch(),
        _dialog = _remote.require('dialog'),
        _ncp = require('ncp').ncp,
        _rimraf = require('rimraf'),
        _xml2js = require('xml2js'),
        _parser = new _xml2js.Parser(),
        _xmlObj = null,
        _unzip = require('unzip'),
        _mkdirp = require('mkdirp'),
        _glob = require("glob"),
        _dirApplications,
        _dirCommonFiles,
        _systemCep5InstallPath,
        _systemCep4InstallPath,
        _userCep5InstallPath = _path.join(_dirAppdata, 'Adobe', 'CEP', 'extensions'),
        _userCep4InstallPath = _path.join(_dirAppdata, 'Adobe', 'CEPServiceManager4', 'extensions'),
        _removeButtons = [],
        _msgtimer,
        _ignoreList = ["com.adobe.DesignLibraries.angular", "AdobeExchange", "com.adobe.behance.shareonbehance.html", "KulerPanelBundle", "SearchForHelp", "com.adobe.preview", "com.adobe.webpa.crema"];

    _parser.addListener('end', function(result) {
        _xmlObj = result;
    });

    // Clear Temp directory
    getDirectories([_path.join(_dirTemp, 'UberManager')], function(directories) {
        if (directories.length > 0) {
            removeDirectories(directories, function() {
            });
        }
    });

    // Check platform
    if (_osPlatform == 'win32') {
        _dirApplications = _path.join(_dirHome, '..', '..', 'Program Files (x86)');
        if (exists(_dirApplications)) {
            _dirCommonFiles = _path.join(_dirApplications, 'Common Files');
        } else {
            _dirCommonFiles = _path.join(_dirHome, '..', '..', 'Program Files', 'Common Files');
            _dirApplications = _path.join(_dirHome, '..', '..', 'Program Files');
        }
        _systemCep5InstallPath = _path.join(_dirCommonFiles, 'Adobe', 'CEP', 'extensions');
        _systemCep4InstallPath = _path.join(_dirCommonFiles, 'Adobe', 'CEPServiceManager4', 'extensions');
    } else {
        _systemCep5InstallPath = _path.join('/Library', 'Application Support', 'Adobe', 'CEP', 'extensions');
        _systemCep4InstallPath = _path.join('/Library', 'Application Support', 'Adobe', 'CEPServiceManager4', 'extensions');
    }


    // Start
    updateExtensionsList();


    function getDirectories(srcpaths, callback) {
        var counter = 0;
        var total = srcpaths.length;
        var directories = [];
        srcpaths.forEach(function(srcpath) {
            if (exists(srcpath)) {
                var files = _fs.readdirSync(srcpath);
                files.forEach(function(file) {
                    if (_fs.statSync(_path.join(srcpath, file)).isDirectory()) {
                        if (_ignoreList.indexOf(file) < 0) {
                            directories.push(_path.join(srcpath, file));
                        }
                    }
                });
            }
            counter++
        });

        //console.log('counter = ' + counter + ' | total = ' + total);

        if (counter == total && callback && typeof(callback) === "function") {
            callback( directories );
        }
        //console.log("Check " + Number(Number(i) + 1) + " of " + srcpath.length + "\n" + srcpath[i])
    }

    function exists(_path, make) {
        make = make || false;
        try {
            _fs.accessSync(_path);
            return _path
        } catch (ex) {
            if (make) {
                _mkdirp(_path, function(err) {
                    if (!err) {
                        return _path
                    } else {
                        console.log(err);
                        return null
                    }
                });
            } else {
                return null
            }
        }
    }

    function getExtensionInfo(pathToExtension, callback) {
        _fs.readFile(_path.join(pathToExtension, 'CSXS', 'manifest.xml'), function(err, data) {
            if (err) {
                console.log('​/ ! \\ Error! Can not read manifest.xml file from: ' + pathToExtension);
                console.log(err);
                callback(null);
            }
            try {
                _parser.parseString(data);
                var ext = {};
                ext.name = _xmlObj.ExtensionManifest.$.ExtensionBundleName || _xmlObj.ExtensionManifest.$.ExtensionBundleId; // Extension Name
                ext.id = _xmlObj.ExtensionManifest.$.ExtensionBundleId;
                ext.path = pathToExtension;
                ext.ver = _xmlObj.ExtensionManifest.$.ExtensionBundleVersion;
                ext.cep = Math.floor(_xmlObj.ExtensionManifest.ExecutionEnvironment[0].RequiredRuntimeList[0].RequiredRuntime[0].$.Version);
                var hostsList = _xmlObj.ExtensionManifest.ExecutionEnvironment[0].HostList[0].Host;
                ext.hosts = [];
                for (i in hostsList) {
                    ext.hosts.push(hostsList[i].$.Name);
                }
                ext.hosts.sort();

                callback(ext);
                //console.log(ext.hosts[i].$.Version.replace(/([\[\]])+/g, '').split(',')); // Supported Versions
                //console.log(_xmlObj.ExtensionManifest.Author[0]); // Author
            } catch (e) {
                console.log('​/ ! \\ Error! Can not parse manifest.xml file from: ' + pathToExtension);
                callback(null);
            }
        });
    }


    function updateExtensionsList() {

        var allPaths = [];
        if (exists(_systemCep4InstallPath, true)) {
            allPaths.push(_systemCep4InstallPath);
        }
        if (exists(_systemCep5InstallPath, true)) {
            allPaths.push(_systemCep5InstallPath);
        }
        if (exists(_userCep4InstallPath, true)) {
            allPaths.push(_userCep4InstallPath);
        }
        if (exists(_userCep5InstallPath, true)) {
            allPaths.push(_userCep5InstallPath);
        }

        getDirectories(allPaths, function(directories) {
            var counter = 0;
            var extensionsList = [];
            directories.forEach(function(extDir) {
                getExtensionInfo(extDir, function(ext){
                    if (ext) extensionsList.push(ext);
                    counter++
                    if (counter == directories.length) {
                        drawExtensionsList(extensionsList);
                    }
                });

            });
        });

    }


    function removeDirectories(paths, callback) {
        var total = paths.length;
        var counter = 0;

        paths.forEach(function(path){
            _rimraf.sync(path);
            counter++
            if (total == counter && callback) callback();
        });

    }

    function installExtension(ext) {
        var listOfDirectroiesToRemove = [];
        var cep5path = _path.join(_systemCep5InstallPath, ext.id);
        var cep4path = _path.join(_systemCep4InstallPath, ext.id);

        function copyExtension(installPaths) {
            var total = installPaths.length;
            var counter = 0;
            installPaths.forEach(function(installPath){
                _ncp(ext.path, installPath, function(err) {
                    if (!err) {
                        toggleMessageBox("success")
                    } else {
                        toggleMessageBox("error", "Installation failed. Error: " + err);
                        console.log(err);
                    }
                    counter++
                    if (total == counter) updateExtensionsList();
                });

            });
        }

        function checkOldVersions(callback) {
            if (exists(cep5path)) {
                listOfDirectroiesToRemove.push(cep5path);
            }
            if (ext.cep < 5 && exists(cep4path)) {
                listOfDirectroiesToRemove.push(cep4path);
            }
            callback();
        }

        checkOldVersions(function() {
            var installPaths = [cep5path];
            if (ext.cep < 5) {
                installPaths.push(cep4path);
            }

            if (listOfDirectroiesToRemove.length > 0) {
                removeDirectories(listOfDirectroiesToRemove, function() {
                    copyExtension(installPaths);
                });
            } else {
                copyExtension(installPaths);
            }
        });

    }



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

        _dialog.showOpenDialog(dialogFilter, function(_f) {

            if (!_f) return

            toggleMessageBox("progress");

            startInstall(_f[0]);

            function startInstall(filepath) {

                var newfile = _path.parse(filepath);

                if (newfile.ext != ".zxp" && newfile.ext != ".zip") {
                    toggleMessageBox("error", "Cannot install this type of file. Please use a ZXP or ZIP file");
                    return
                }

                var extractPath = _path.join(_dirTemp, 'UberManager', newfile.name + '_' + Math.random().toString().substr(2, 9));

                var readStream = _fs.createReadStream(filepath);

                var _unzipStream = _unzip.Extract({
                    path: extractPath
                });

                _unzipStream.on('close', function() {
                    // + support Davide Barranca PSInstall script & other _unzipped extension
                    var manifestFile = _glob.sync('**/CSXS/manifest.xml', {
                        cwd: extractPath
                    });
                    if (manifestFile.length == 1) {
                        extractPath = _path.join(extractPath, manifestFile[0], '..', '..');
                        getExtensionInfo(extractPath, function(ext){
                            installExtension(ext);
                        });
                    } else {
                        // + support multipack extensionons
                        var zxpFiles = _glob.sync('**/*.zxp', {
                            cwd: extractPath
                        });
                        for (i in zxpFiles) {
                            startInstall(_path.join(extractPath, zxpFiles[i]))
                        }
                    }

                });
                _unzipStream.on('end', function() {
                    // Use on.('close'
                    //getExtensionInfo(extractPath, true);
                });
                _unzipStream.on('error', function(err) {
                    toggleMessageBox("error", "Installation failed because UberManager could not parse the ZXP file");
                    updateExtensionsList();
                });

                readStream.pipe(_unzipStream);
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

        _removeButtons = document.getElementsByClassName('extension_remove');

        for (var i = 0; i < _removeButtons.length; i++) {
            _removeButtons[i].addEventListener('click', clickOnRemoveIcon, false);
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
                clearTimeout(_msgtimer);
                installbtn.disabled = true;
                msg_progress_text.innerHTML = message || "Installation is in progress";
                msg_progress.style["display"] = "block";
                message_box.className = message_box.className + " progress";
            }

            if (type == "success") {
                clearTimeout(_msgtimer);
                installbtn.disabled = false;
                msg_success_text.innerHTML = message || "Extension successfully installed";
                msg_success.style["display"] = "block";
                message_box.className = message_box.className + " success";
                _msgtimer = setTimeout(hideMessageBox, 3000);
            }

            if (type == "error") {
                clearTimeout(_msgtimer);
                installbtn.disabled = false;
                msg_error_text.innerHTML = message || "Oops, unknown error";
                msg_error.style["display"] = "block";
                message_box.className = message_box.className + " error";
                _msgtimer = setTimeout(hideMessageBox, 10000);
            }

        } else {
            clearTimeout(_msgtimer);
            installbtn.disabled = false;
            hideMessageBox();
        }


    }
}
init();
