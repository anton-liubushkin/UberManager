# UberManager

UberManager is a simple cross platform (OS X and Windows) installer for third party Adobe extensions (`.zxp` files). It serves as a replacement for the Extension Manager which no longer is not supported after CC 2014.

# How it works

UberManager uses Electron (http://electron.atom.io) to create a cross platform HTML/node.js app.

# Setup (OS X)

1. Install [Node.js](https://nodejs.org/).
2. Install the dependencies and start the app.
```
cd app
npm install
cd ..
npm install
npm run dev
```

# Compiling (OS X)

1. Install [Homebrew](http://brew.sh/).
2. Install `wine` and `makensis` for electron-builder (needed to build the Windows installer).    
    ```
brew install wine makensis
```
3. Run the build script    
    ```
npm run pack
```
4. You will find the compiled binaries in the `release` directory.
