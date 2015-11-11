# UberManager

UberManager is a simple cross platform (OS X and Windows) manager for third party Adobe extensions (`.zxp` files). It serves as a replacement for the Extension Manager which no longer is not supported after CC 2014.

![UberManager 0.1.0](https://raw.githubusercontent.com/nvkzNemo/UberManager/master/assets/screenshot/0.1.0.png)

# How it works

UberManager uses Electron (http://electron.atom.io) to create a cross platform HTML/node.js app.

# Setup (OS X)

1. Install [Node.js](https://nodejs.org/).

1. Install the dependencies and start the app.
    ```
    npm install
    npm run dev
    ```

# Compiling (OS X)

1. Install [Homebrew](http://brew.sh/).

1. Install `wine` and `makensis` for electron-builder (needed to build the Windows installer).

    ```
    brew install wine makensis
    ```

1. Run the build script

    ```
    npm run pack
    ```

1. You will find the compiled binaries in the `release` directory.
