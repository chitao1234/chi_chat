import { Socket, Server } from 'net';
import { createServer, connect } from 'net';

// const { createServer, connect } = require('net');

var port: number = 14622;
var socket: Socket;
var server: Server;
var separater_length = 1; // ':', '|'

function update_main_server_address() {
    let main_server_address = (<HTMLInputElement>document.getElementById('server_address')).value;
    if (main_server_address) {
        start_client(main_server_address);
    } else {
        start_server();
    }
}
document.getElementById('update_server_address')!.addEventListener('click', _event => { update_main_server_address(); })

var address_name_dict: { [index: string]: string } = {};

function data_receive(name: string, data: string[]) {
    message_add(name, data[0], data[1]);
}

function start_server() {
    var address_connection_dict: { [index: string]: Socket } = {};

    function get_processed_address(connection: Socket) {  // 10.10.10.10, 12345
        //前两个在关闭连接时会变成undefined
        // return connection.localAddress + ', ' + connection.localPort + ', ' + connection.remoteAddress + ', ' + connection.remotePort;
        return connection.remoteAddress + ', ' + connection.remotePort;
    }

    var data_send: (arg1: string, arg2: string) => void
        = (content: string, type: string) => {
            data_send_raw(content + separater + type, '');
        }

    var data_send_raw: (arg1: string, arg2: string) => void
        = (str: string, exclude: string) => {
            for (var address in address_connection_dict) {
                // check if the property/key is defined in the object itself, not in parent
                if (address == exclude) continue;
                if (address_connection_dict.hasOwnProperty(address)) {
                    address_connection_dict[address]!.write(str);
                }
            }
        }

    function data_receive_wrapper(address: string, data: Buffer) {
        let data_string: string = data.toString();
        if (data_string.startsWith(separater_special)) {
            let data_array: string[] = data_string.slice(separater_length).split(separater);
            if (data_array[0] == 'NAME') {  // :NAME|chi1
                if (address_name_dict.hasOwnProperty(address)) {
                    up_list_update(address);
                    up_list_update(address, data_array[1]);
                } else {
                    up_list_update(address, data_array[1]);
                    address_connection_dict[address]!.write(separater_special + 'CLIENT' + separater + 'DICT' + separater + JSON.stringify(address_name_dict));
                }
                address_name_dict[address] = data_array[1]!;
                data_send_raw(separater_special + 'CLIENT' + separater + 'NAME' + separater + data_string[1] + separater + address, address);
            }
        } else {  // test123|text
            data_receive(address_name_dict[address]!, data_string.split(separater));
            data_send_raw(separater_special + 'CLIENT' + separater + 'RELAY' + separater + address + separater + data_string, address);
        }
    }

    server = createServer();
    server.listen(port);

    server.on('connection', function (socket) {
        socket.setNoDelay(true);
        let address = get_processed_address(socket);

        address_connection_dict[address] = socket;

        socket.write(separater_special + 'NAME' + separater + username);

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
            error_message!.innerText = '网络错误：' + err;
        });
    });
}

//TODO:NEED URGENT REFRACTORING!!!
function start_client(server_address: string) {
    console.log(server_address);
    function data_receive_wrapper(data: Buffer) {
        let data_string: string = data.toString();
        if (data_string.startsWith(separater_special)) {
            let data_array: string[] = data_string.slice(separater_length).split(separater);
            if (data_array[0] == 'CLIENT') {
                if (data_array[1] == 'NAME') {  // :CLIENT|NAME|chi2|10.10.10.10,12348
                    let address: string = data_array[3]!;
                    if (address_name_dict.hasOwnProperty(address)) {
                        up_list_update(address, '');
                        up_list_update(address, data_array[2]);
                    } else {
                        up_list_update(address, data_array[2]);
                    }
                    address_name_dict[address] = data_array[2]!;
                } else if (data_array[1] == 'LOGOUT') {  // :CLIENT|LOGOUT|10.10.10.10,12348
                    let address: string = data_array[2]!;
                    delete address_name_dict[address];
                    up_list_update(address, '');
                } else if (data_array[1] == 'RELAY') {  // :CLIENT|RELAY|10.10.10.10,12348|test123|text
                    console.log(data)
                    let address: string = data_array[2]!;
                    data_receive(address_name_dict[address]!, [data_array[3]!, data_array[4]!]);
                } else if (data_array[1] == 'DICT') {  // :CLIENT|DICT|{"10.10.10.10,12348", "chi2"}
                    address_name_dict = JSON.parse(data_array[2]!);
                    for (var address in address_name_dict) {
                        // check if the property/key is defined in the object itself, not in parent
                        if (address_name_dict.hasOwnProperty(address)) {
                            up_list_update(address, '');
                            up_list_update(address, data_array[2]);
                        } else {
                            up_list_update(address, data_array[2]);
                        }
                    }
                }
            } else if (data_array[0] == 'NAME') {  // :NAME|chi1
                address_name_dict[server_address] = data_array[1]!;
                up_list_update(server_address, data_array[1]);
            }
        } else {  // test123|text
            data_receive(address_name_dict[server_address]!, data_string.split(separater));
        }
    }

    var data_send: (arg1: string, arg2: string) => void
        = (content: string, type: string) => {
            socket.write(content + separater + type);
        }

    var data_send_raw: (arg1: string, arg2: string) => void
        = (str: string, _exclude: string) => { socket.write(str); };

    socket = connect(port, server_address);
    socket.setNoDelay(true);

    socket.write(separater_special + 'NAME' + separater + username);

    socket.on('data', data_receive_wrapper);

    socket.on('error', function (err) {
        console.log(`Error: ${err}`);
        error_message!.innerText = '网络错误：' + err;
    });

    // socket.on('close', function() {
    //     console.log('Connection closed');
    // });
}
