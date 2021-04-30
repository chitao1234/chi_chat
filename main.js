const { app, BrowserWindow, Menu } = require('electron');

let mainWindow;

function createWindow () {
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 800
    });

    const mainMenu = Menu.buildFromTemplate(Menus);
    Menu.setApplicationMenu(mainMenu);

    mainWindow.loadFile('index.html');
}

const Menus = [
    {
        label: '文件',
        submenu:
            [
                {
                    label: '开发者工具',
                    accelerator: 'F12',
                    click: () => {
                        BrowserWindow.getFocusedWindow().webContents.openDevTools();
                    }
                },
                {
                    label: '重设用户名',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('reset_username();');
                    }
                }
            ]
    },
    {
        label: '关于',
        click: () => {
            const newWindow = new BrowserWindow({
                width: 640,
                height: 480
            });
            newWindow.setMenuBarVisibility(false);
            newWindow.loadFile('web/about.html');
        }
    }
];

app.whenReady().then(() => {
    createWindow();

    mainWindow.on('focus', () => mainWindow.flashFrame(false));

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    mainWindow.webContents.executeJavaScript('end()');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
