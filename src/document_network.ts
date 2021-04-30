import { Socket, Server, createServer, connect } from 'net';

const { BrowserWindow, dialog } = require('electron').remote;

const mainWindow = BrowserWindow.getFocusedWindow();

function getDatetime () {
    const date = new Date();
    const milisecond = String(date.getMilliseconds()).padStart(3, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const datetime = year + '/' + month + '/' + day + ' ' + hour + ':' + minute + ':' + second + '.' + milisecond;
    return datetime;
}

const form = document.getElementById('message_send')!;
const inputArea = <HTMLInputElement>document.getElementById('input_area');
const messageArea = document.getElementById('message_area')!;
const errorMessage = document.getElementById('error_message')!;
const uplist = document.getElementById('up_list')!;
const mainWrapper = document.getElementById('main_wrapper')!;
const usernameWrapper = document.getElementById('username_wrapper')!;
const usernameLabel = document.getElementById('username_label')!;
let username = '';
const separater = '|';
const separaterSpecial = ':';
const separaterPort = ', ';
const separaterLength = 1; // ':', '|'
let socket: Socket;
let server: Server;

mainWrapper.style.display = 'none';

function HTMLConstruct (content: string, type: string) {
    let outputHTML = '';
    switch (type) {
    case 'image':
        outputHTML += '<img class="content_image" src="' + content + '" />';
        break;
    case 'file':
        outputHTML += '<img class="content_file" src="asset/file.svg" /><label class="content_file_label">' + content + '</label>';
        break;
    case 'html':
        // TODO: 图文混排
        break;
    case 'text':
    default:
        outputHTML += '<p class="content_text">' + content + '</p>';
        break;
    }
    return outputHTML;
}

let dataSend: (arg1: string, arg2: string) => void;
let dataSendRaw: (arg1: string, arg2: string) => void;

function messageAddWrapper (content: string, type: string) {
    dataSend(content, type);
    messageAdd('', content, type);
}

function messageAdd (sender: string, content: string, type: string) {
    let finalHTML: string;
    if (sender) {
        finalHTML = '<div class="message"><p class="info">' + sender + ' ' + getDatetime() + '</p>';
    } else {
        finalHTML = '<div class="message"><p class="info self">' + username + ' ' + getDatetime() + '</p>';
    }
    finalHTML += HTMLConstruct(content, type);
    finalHTML += '</div>';
    messageArea.innerHTML += finalHTML;
    messageArea.scrollTop = messageArea.scrollHeight - messageArea.clientHeight;
}

form.addEventListener('submit', function (_event) {
    messageAddWrapper(inputArea.value, 'text');
});

function uploadImage (file: string) {
    messageAddWrapper(file, 'image');
}

function uploadFiles (files: string[]) {
    files.forEach(function (file) {
        const filename = file.split('/').slice(-1)[0]!;
        messageAddWrapper(filename, 'file');
    });
}

document.getElementById('image_select')!.addEventListener('click', function (_event) {
    dialog.showOpenDialog(mainWindow, {
        title: '打开图片',
        properties: ['openFile'],
        filters: [
            { name: '图片文件', extensions: ['xbm', 'tif', 'pjp', 'svgz', 'jpg', 'jpeg', 'ico', 'tiff', 'gif', 'svg', 'jfif', 'webp', 'png', 'bmp', 'pjpeg', 'avif'] }
        ]
    }, function (files: string) {
        if (files) {
            if (files[0]) {
                // console.log(files[0]);
                uploadImage(files[0]);
            }
        }
    });
});

document.getElementById('file_select')!.addEventListener('click', function (_event) {
    dialog.showOpenDialog(mainWindow, {
        title: '打开文件',
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: '所有文件', extensions: ['*'] }
        ]
    }, function (files: string[]) {
        if (files) {
            console.log(files);
            uploadFiles(files);
        }
    });
});

function uplistUpdate (address: string, name: string) {
    if (name) {
        uplist.innerHTML += '<div class="connection_entry" id="' + address + '"><span class="person">' + name + '</span><span class="address">(' + address + ')</span></div>';
    } else {
        const entry = document.getElementById(address);
        entry!.parentNode!.removeChild(entry!);
    }
}

function updateUsername (event: KeyboardEvent | null) {
    if (event) {
        console.log(event.key);
        if (event.key !== 'Enter') {
            return;
        }
    }
    username = (<HTMLInputElement>document.getElementById('username')!).value;
    if (!username) {
        return;
    }
    usernameWrapper.style.display = 'none';
    usernameLabel.innerText += username;
    uplistUpdate('localhost', username);
    if (dataSendRaw) {
        dataSendRaw(separaterSpecial + 'NAME' + separater + username, '');
    }
    if (mainWrapper.style.display === 'none') {
        mainWrapper.style.display = 'block';
    }
}

document.getElementById('username_submit')!.addEventListener('click', (_event) => { updateUsername(null); });
document.getElementById('username')!.addEventListener('keydown', updateUsername);

// eslint-disable-next-line no-unused-vars
function resetUsername () {
    usernameWrapper.style.display = 'block';
    usernameLabel.innerText = '用户名：';
    uplistUpdate('localhost', '');
}

inputArea.addEventListener('keydown', (event) => {
    // ctrl + enter
    if (event.ctrlKey && event.key === 'Enter') {
        messageAddWrapper(inputArea.value, 'text');
        inputArea.value = '';
    }
});

const port: number = 14622;

// eslint-disable-next-line no-unused-vars
function end () {
    server?.close();
    socket?.end();
    socket?.destroy();
}

function updateMainServerAddress (event: KeyboardEvent | null) {
    if (event) {
        if (event.key !== 'Enter') {
            return;
        }
    }
    const mainServerAddress = (<HTMLInputElement>document.getElementById('server_address')).value;
    if (mainServerAddress) {
        startClient(mainServerAddress);
    } else {
        startServer();
    }
}
document.getElementById('update_server_address')!.addEventListener('click', _event => { updateMainServerAddress(null); });
document.getElementById('server_address')!.addEventListener('keydown', event => { updateMainServerAddress(event); });

const addressNameDict: { [index: string]: string } = {};

function dataReceive (name: string, data: string[]) {
    messageAdd(name, data[0]!, data[1]!);
    mainWindow.flashFrame(true);
}

function startServer () {
    const addressConnectionDict: { [index: string]: Socket } = {};

    function getProcessedAddress (connection: Socket) { // 10.10.10.10, 12345
    // 前两个在关闭连接时会变成undefined
    // return connection.localAddress + ', ' + connection.localPort + ', ' + connection.remoteAddress + ', ' + connection.remotePort;
        return connection.remoteAddress + separaterPort + connection.remotePort;
    }

    dataSend = (content: string, type: string) => {
        dataSendRaw(content + separater + type, '');
    };

    dataSendRaw = (str: string, exclude: string) => {
        for (const address in addressConnectionDict) {
            // check if the property/key is defined in the object itself, not in parent
            if (address === exclude) continue;
            if (Object.hasOwnProperty.call(addressConnectionDict, address)) {
                addressConnectionDict[address]!.write(str);
            }
        }
    };

    function dataReceiveWrapper (address: string, data: Buffer) {
        const dataString: string = data.toString();
        if (dataString.startsWith(separaterSpecial)) {
            const dataArray: string[] = dataString.slice(separaterLength).split(separater);
            if (dataArray[0] === 'NAME') { // :NAME|chi1
                if (Object.hasOwnProperty.call(addressNameDict, address)) {
                    uplistUpdate(address, '');
                    uplistUpdate(address, dataArray[1]!);
                } else {
                    uplistUpdate(address, dataArray[1]!);
                }
                addressNameDict[address] = dataArray[1]!;
                dataSendRaw(separaterSpecial + 'CLIENT' + separater + 'NAME' + separater + dataArray[1] + separater + address, address);
            }
        } else { // test123|text
            dataReceive(addressNameDict[address]!, dataString.split(separater));
            dataSendRaw(separaterSpecial + 'CLIENT' + separater + 'RELAY' + separater + address + separater + dataString, address);
        }
    }

    // eslint-disable-next-line no-unused-vars
    function sendUsernameDict () {
        dataSendRaw(separaterSpecial + 'CLIENT' + separater + 'DICT' + separater + JSON.stringify(addressNameDict), '');
    }

    server = createServer();
    server.listen(port);

    server.on('connection', function (socket) {
        socket.setNoDelay(true);
        const address = getProcessedAddress(socket);

        addressConnectionDict[address] = socket;

        socket.write(separaterSpecial + 'NAME' + separater + username);

        socket.on('data', (data) => {
            dataReceiveWrapper(address, data);
        });

        socket.on('end', function () {
            delete addressNameDict[address];
            delete addressConnectionDict[address];
            uplistUpdate(address, '');
        });

        socket.on('error', function (err) {
            console.log(`Error: ${err}`);
            errorMessage!.innerText = '网络错误：' + err;
        });
    });
}

// TODO:NEED URGENT REFRACTORING!!!
function startClient (serverAddress: string) {
    const serverAddressPort = serverAddress + separaterPort + port;
    console.log(serverAddressPort);
    function dataReceiveWrapper (data: Buffer) {
        const dataString: string = data.toString();
        if (dataString.startsWith(separaterSpecial)) {
            const dataArray: string[] = dataString.slice(separaterLength).split(separater);
            if (dataArray[0] === 'CLIENT') {
                if (dataArray[1] === 'NAME') { // :CLIENT|NAME|chi2|10.10.10.10,12348
                    const address: string = dataArray[3]!;
                    if (Object.hasOwnProperty.call(addressNameDict, address)) {
                        uplistUpdate(address, '');
                        uplistUpdate(address, dataArray[2]!);
                    } else {
                        uplistUpdate(address, dataArray[2]!);
                    }
                    addressNameDict[address] = dataArray[2]!;
                } else if (dataArray[1] === 'LOGOUT') { // :CLIENT|LOGOUT|10.10.10.10,12348
                    const address: string = dataArray[2]!;
                    delete addressNameDict[address];
                    uplistUpdate(address, '');
                } else if (dataArray[1] === 'RELAY') { // :CLIENT|RELAY|10.10.10.10,12348|test123|text
                    const address: string = dataArray[2]!;
                    dataReceive(addressNameDict[address]!, [dataArray[3]!, dataArray[4]!]);
                } else if (dataArray[1] === 'DICT') { // :CLIENT|DICT|{"10.10.10.10,12348", "chi2"}
                    const addressNameDictTemp: { [index: string]: string } = JSON.parse(dataArray[2]!);
                    for (const address in addressNameDictTemp) {
                        // check if the property/key is defined in the object itself, not in parent
                        if (Object.hasOwnProperty.call(addressNameDictTemp, address)) {
                            if (address === 'localhost' || addressNameDictTemp[address] === username) {
                                continue;
                            }

                            const tempName = addressNameDictTemp[address]!;
                            if (Object.hasOwnProperty.call(addressNameDict, address)) {
                                if (addressNameDict[address] !== tempName) {
                                    uplistUpdate(address, '');
                                    uplistUpdate(address, tempName);
                                }
                            } else {
                                addressNameDict[address] = tempName;
                                uplistUpdate(address, tempName);
                            }
                        }
                    }
                }
            } else if (dataArray[0] === 'NAME') { // :NAME|chi1
                addressNameDict[serverAddressPort] = dataArray[1]!;
                uplistUpdate(serverAddressPort, dataArray[1]!);
            }
        } else { // test123|text
            dataReceive(addressNameDict[serverAddressPort]!, dataString.split(separater));
        }
    }

    dataSend = (content: string, type: string) => {
        socket.write(content + separater + type);
    };

    dataSendRaw = (str: string, _exclude: string) => { socket.write(str); };

    socket = connect(port, serverAddress);
    socket.setNoDelay(true);

    socket.write(separaterSpecial + 'NAME' + separater + username);

    socket.on('data', dataReceiveWrapper);

    socket.on('error', function (err) {
        console.log(`Error: ${err}`);
        errorMessage!.innerText = '网络错误：' + err;
    });

    // socket.on('close', function() {
    //     console.log('Connection closed');
    // });
}
