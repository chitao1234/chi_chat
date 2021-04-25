var form = document.getElementById('message_send');
var input_area = document.getElementById('input_area');
var message_area = document.getElementById('message_area');
var error_message = document.getElementById('error_message');
var up_list = document.getElementById('up_list');
var username = '';

var server;
var socket;

function html_construct(content, type) {
    let outputHTML = '';
    switch (type) {
        case 'image':
            outputHTML += `<img class="content_image" src="${content}" />`;
            break;
        case 'file':
            outputHTML += `<img class="content_file" src="asset/file.svg" /><label class="content_file_label">${content}</label>`;
            break;
        case 'html':
            //TODO: 图文混排
            break;
        case 'text':
        default:
            outputHTML += `<p class="content_text">${content}</p>`;
            break;
    }
    return outputHTML;
}

var data_send;
var data_send_raw;

function message_add_wrapper(content, type) {
    data_send(content, type);
    message_add('', content, type);
}

function message_add(sender, content, type) {
    if (sender) {
        finalHTML = `<div class="message"><p class="info">${sender} ${get_datetime()}</p>`;
    } else {
        finalHTML = `<div class="message"><p class="info self">${username} ${get_datetime()}</p>`;
    }
    finalHTML += html_construct(content, type)
    finalHTML += '</div>';
    message_area.innerHTML += finalHTML;
    message_area.scrollTop = message_area.scrollHeight - message_area.clientHeight;
}

form.addEventListener('submit', (event) => {
    message_add_wrapper(input_area.value, 'text');
});

function upload_image(file) {
    message_add_wrapper(file, 'image');
}

function upload(files) {
    files.forEach(file => {
        filename = file.split('/').slice(-1)[0];
        message_add_wrapper(filename, 'file');
    });
}

document.getElementById('image_select').addEventListener('click', function (event) {
    dialog.showOpenDialog(mainWindow, {
        title: '打开图片',
        properties: ['openFile'],
        filters: [
            { name: '图片文件', extensions: ['xbm', 'tif', 'pjp', 'svgz', 'jpg', 'jpeg', 'ico', 'tiff', 'gif', 'svg', 'jfif', 'webp', 'png', 'bmp', 'pjpeg', 'avif'] }
        ]
    }, (files) => {
        if (files) {
            if (files[0]) {
                // console.log(files[0]);
                upload_image(files[0]);
            }
        }
    });
});

document.getElementById('file_select').addEventListener('click', function (event) {
    dialog.showOpenDialog(mainWindow, {
        title: '打开文件',
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: '所有文件', extensions: ['*'] }
        ]
    }, (files) => {
        if (files) {
            console.log(files);
            upload(files);
        }
    });
});

function up_list_update(address, name) {
    if (name) {
        up_list.innerHTML += `<div class="connection_entry" id="${address}"><span class="person">${name}</span><span class="address">(${address})</span></div>`;
    } else {
        let entry = document.getElementById(address);
        entry.parentNode.removeChild(entry);
    }
}

document.getElementById('username_submit').addEventListener('click', function (event) {
    username = document.getElementById('username').value;
    document.getElementById('username_wrapper').style.display = 'none';
    document.getElementById('username_label').innerText += username;
    up_list_update('localhost', username);
    data_send_raw(':::' + 'NAME' + '|||' + username);
});

function reset_username() {
    document.getElementById('username_wrapper').style.display = 'block';
    document.getElementById('username_label').innerText = '用户名：';
    up_list_update('localhost', '');
}



const { createServer, connect } = require('net');

var port = 14622;

function update_main_server_address() {
    main_server_address = document.getElementById('server_address').value;
    if (main_server_address) {
        start_client(main_server_address);

    } else {
        start_server();
    }
}
document.getElementById('update_server_address').addEventListener('click', event => { update_main_server_address(); })

var address_name_dict = {};

function data_receive(name, data) {
    data = data.split('|||');
    message_add(name, data[0], data[1]);
}

function start_server() {
    var address_connection_dict = {};

    function get_processed_address(connection) {
        //前两个在关闭连接时会变成undefined
        // return connection.localAddress + ', ' + connection.localPort + ', ' + connection.remoteAddress + ', ' + connection.remotePort;
        return connection.remoteAddress + ', ' + connection.remotePort;
    }

    data_send = (content, type) => {
        data_send_raw(`${content}|||${type}`, '');
    }

    data_send_raw = (str, exclude) => {
        for (var address in address_connection_dict) {
            // check if the property/key is defined in the object itself, not in parent
            if (address == exclude) continue;
            if (address_connection_dict.hasOwnProperty(address)) {
                address_connection_dict[address].write(str);
            }
        }
    }

    function data_receive_wrapper(address, data) {
        data = data.toString();
        if (data.startsWith(':::')) {
            data = data.slice(3).split('|||');
            if (data[0] == 'NAME') {  // :::NAME|||chi1
                if (address_name_dict.hasOwnProperty(address)) {
                    up_list_update(address);
                    up_list_update(address, data[1]);
                } else {
                    up_list_update(address, data[1]);
                    address_connection_dict[address].write(':::CLIENT|||DICT|||' + JSON.stringify(address_name_dict));
                }
                address_name_dict[address] = data[1];
                data_send_raw(':::CLIENT|||NAME|||' + data[1] + '|||' + address, address);
            }
        } else {  // test123|||text
            data_receive(address_name_dict[address], data);
            data_send_raw(':::CLIENT|||RELAY|||' + address + '|||' + data, address);
        }
    }

    server = createServer();
    server.listen(port);

    server.on('connection', function (socket) {
        socket.setNoDelay(true);
        let address = get_processed_address(socket);

        address_connection_dict[address] = socket;

        socket.write(':::NAME|||' + username);

        socket.on('data', (data) => {
            data_receive_wrapper(address, data);
        });

        socket.on('end', function () {
            delete address_name_dict[address];
            delete address_connection_dict[address];
            up_list_update(address, '');
        });

        socket.on('error', function (err) {
            console.log(`Error: ${err}`);
            error_message.innerText = '网络错误：' + err;
        });
    });
}

function start_client(server_address) {
    console.log(server_address);
    function data_receive_wrapper(data) {
        data = data.toString();
        if (data.startsWith(':::')) {
            data = data.slice(3).split('|||');
            if (data[0] == 'CLIENT') {
                if (data[1] == 'NAME') {  // :::CLIENT||||NAME||||chi2||||10.10.10.10
                    let address = data[3];
                    if (address_name_dict.hasOwnProperty(address)) {
                        up_list_update(address, '');
                        up_list_update(address, data[2]);
                    } else {
                        up_list_update(address, data[2]);
                    }
                    address_name_dict[address] = data[2];
                } else if (data[1] == 'LOGOUT') {  // :::CLIENT|||LOGOUT|||10.10.10.10
                    let address = data[2];
                    delete address_name_dict[address];
                    up_list_update(address, '');
                } else if (data[1] == 'RELAY') {  // :::CLIENT|||RELAY|||10.10.10.10|||test123|||text
                    let address = data[2];
                    data_receive(address_name_dict[address], data.slice(3))
                } else if (data[1] == 'DICT') {  // :::CLIENT|||DICT|||{"10.10.10.10", "chi2"}
                    address_name_dict = JSON.parse(data[2]);
                    for (var address in address_name_dict) {
                        // check if the property/key is defined in the object itself, not in parent
                        if (address_name_dict.hasOwnProperty(address)) {
                            up_list_update(address, '');
                            up_list_update(address, data[2]);
                        } else {
                            up_list_update(address, data[2]);
                        }
                    }
                }
            } else if (data[0] == 'NAME') {  // :::NAME|||chi1
                address_name_dict[server_address] = data[1];
                up_list_update(server_address, data[1]);
            }
        } else {  // test123|||text
            data_receive(address_name_dict[server_address], data);
        }
    }

    data_send = (content, type) => {
        socket.write(`${content}|||${type}`);
    }

    data_send_raw = (str) => {socket.write(str);};

    socket = connect(port, server_address);
    socket.setNoDelay(true);

    socket.write(':::NAME|||' + username);

    socket.on('data', data_receive_wrapper);

    socket.on('error', function (err) {
        console.log(`Error: ${err}`);
        error_message.innerText = '网络错误：' + err;
    });

    // socket.on('close', function() {
    //     console.log('Connection closed');
    // });
}
