import { Socket, Server, createServer, connect } from 'net'

const form = document.getElementById('message_send')!
const input_area = <HTMLInputElement>document.getElementById('input_area')
const message_area = document.getElementById('message_area')!
const error_message = document.getElementById('error_message')!
const up_list = document.getElementById('up_list')!
const main_wrapper = document.getElementById('main_wrapper')!
const username_wrapper = document.getElementById('username_wrapper')!
const username_label = document.getElementById('username_label')!
let username = ''
const separater_special = ':'
const separater_port = ', '
const separater = '|'
const separater_length = 1 // ':', '|'
let socket: Socket
let server: Server

main_wrapper.style.display = 'none'

function html_construct (content: string, type: string) {
  let outputHTML = ''
  switch (type) {
    case 'image':
      outputHTML += '<img class="content_image" src="' + content + '" />'
      break
    case 'file':
      outputHTML += '<img class="content_file" src="asset/file.svg" /><label class="content_file_label">' + content + '</label>'
      break
    case 'html':
      // TODO: 图文混排
      break
    case 'text':
    default:
      outputHTML += '<p class="content_text">' + content + '</p>'
      break
  }
  return outputHTML
}

let data_send: (arg1: string, arg2: string) => void
let data_send_raw: (arg1: string, arg2: string) => void

function message_add_wrapper (content: string, type: string) {
  data_send(content, type)
  message_add('', content, type)
}

function message_add (sender: string, content: string, type: string) {
  let finalHTML: string
  if (sender) {
    finalHTML = '<div class="message"><p class="info">' + sender + ' ' + get_datetime() + '</p>'
  } else {
    finalHTML = '<div class="message"><p class="info self">' + username + ' ' + get_datetime() + '</p>'
  }
  finalHTML += html_construct(content, type)
  finalHTML += '</div>'
  message_area.innerHTML += finalHTML
  message_area.scrollTop = message_area.scrollHeight - message_area.clientHeight
}

form.addEventListener('submit', function (_event) {
  message_add_wrapper(input_area.value, 'text')
})

function upload_image (file: string) {
  message_add_wrapper(file, 'image')
}

function upload (files: string[]) {
  files.forEach(function (file) {
    const filename = file.split('/').slice(-1)[0]!
    message_add_wrapper(filename, 'file')
  })
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
        upload_image(files[0])
      }
    }
  })
})

document.getElementById('file_select')!.addEventListener('click', function (_event) {
  dialog.showOpenDialog(mainWindow, {
    title: '打开文件',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '所有文件', extensions: ['*'] }
    ]
  }, function (files: string[]) {
    if (files) {
      console.log(files)
      upload(files)
    }
  })
})

function up_list_update (address: string, name: string) {
  if (name) {
    up_list.innerHTML += '<div class="connection_entry" id="' + address + '"><span class="person">' + name + '</span><span class="address">(' + address + ')</span></div>'
  } else {
    const entry = document.getElementById(address)
        entry!.parentNode!.removeChild(entry!)
  }
}

function update_username (event: KeyboardEvent | null) {
  if (event) {
    console.log(event.key)
    if (event.key != 'Enter') {
      return
    }
  }
  username = (<HTMLInputElement>document.getElementById('username')!).value
  if (!username) {
    return
  }
  username_wrapper.style.display = 'none'
  username_label.innerText += username
  up_list_update('localhost', username)
  if (data_send_raw) {
    data_send_raw(separater_special + 'NAME' + separater + username, '')
  }
  if (main_wrapper.style.display == 'none') {
    main_wrapper.style.display = 'block'
  }
}

document.getElementById('username_submit')!.addEventListener('click', (_event) => { update_username(null) })
document.getElementById('username')!.addEventListener('keydown', update_username)

function reset_username () {
  username_wrapper.style.display = 'block'
  username_label.innerText = '用户名：'
  up_list_update('localhost', '')
}

input_area.addEventListener('keydown', (event) => {
  // ctrl + enter
  if (event.ctrlKey && event.key == 'Enter') {
    message_add_wrapper(input_area.value, 'text')
    input_area.value = ''
  }
})

const port: number = 14622

function end () {
  server?.close()
  socket?.end()
  socket?.destroy()
}

function update_main_server_address (event: KeyboardEvent | null) {
  if (event) {
    if (event.key != 'Enter') {
      return
    }
  }
  const main_server_address = (<HTMLInputElement>document.getElementById('server_address')).value
  if (main_server_address) {
    start_client(main_server_address)
  } else {
    start_server()
  }
}
document.getElementById('update_server_address')!.addEventListener('click', _event => { update_main_server_address(null) })
document.getElementById('server_address')!.addEventListener('keydown', event => { update_main_server_address(event) })

const address_name_dict: { [index: string]: string } = {}

function data_receive (name: string, data: string[]) {
  message_add(name, data[0]!, data[1]!)
  mainWindow.flashFrame(true)
}

function start_server () {
  const address_connection_dict: { [index: string]: Socket } = {}

  function get_processed_address (connection: Socket) { // 10.10.10.10, 12345
    // 前两个在关闭连接时会变成undefined
    // return connection.localAddress + ', ' + connection.localPort + ', ' + connection.remoteAddress + ', ' + connection.remotePort;
    return connection.remoteAddress + separater_port + connection.remotePort
  }

  data_send = (content: string, type: string) => {
    data_send_raw(content + separater + type, '')
  }

  data_send_raw = (str: string, exclude: string) => {
    for (const address in address_connection_dict) {
      // check if the property/key is defined in the object itself, not in parent
      if (address == exclude) continue
      if (address_connection_dict.hasOwnProperty(address)) {
                address_connection_dict[address]!.write(str)
      }
    }
  }

  function data_receive_wrapper (address: string, data: Buffer) {
    const data_string: string = data.toString()
    if (data_string.startsWith(separater_special)) {
      const data_array: string[] = data_string.slice(separater_length).split(separater)
      if (data_array[0] == 'NAME') { // :NAME|chi1
        if (address_name_dict.hasOwnProperty(address)) {
          up_list_update(address, '')
          up_list_update(address, data_array[1]!)
        } else {
          up_list_update(address, data_array[1]!)
        }
        address_name_dict[address] = data_array[1]!
        data_send_raw(separater_special + 'CLIENT' + separater + 'NAME' + separater + data_string[1] + separater + address, address)
      }
    } else { // test123|text
      data_receive(address_name_dict[address]!, data_string.split(separater))
      data_send_raw(separater_special + 'CLIENT' + separater + 'RELAY' + separater + address + separater + data_string, address)
    }
  }

  function send_username_dict () {
    data_send_raw(separater_special + 'CLIENT' + separater + 'DICT' + separater + JSON.stringify(address_name_dict), '')
  }

  server = createServer()
  server.listen(port)

  server.on('connection', function (socket) {
    socket.setNoDelay(true)
    const address = get_processed_address(socket)

    address_connection_dict[address] = socket

    socket.write(separater_special + 'NAME' + separater + username)

    socket.on('data', (data) => {
      data_receive_wrapper(address, data)
    })

    socket.on('end', function () {
      delete address_name_dict[address]
      delete address_connection_dict[address]
      up_list_update(address, '')
    })

    socket.on('error', function (err) {
      console.log(`Error: ${err}`)
            error_message!.innerText = '网络错误：' + err
    })
  })
}

// TODO:NEED URGENT REFRACTORING!!!
function start_client (server_address: string) {
  const server_address_port = server_address + separater_port + port
  console.log(server_address_port)
  function data_receive_wrapper (data: Buffer) {
    const data_string: string = data.toString()
    if (data_string.startsWith(separater_special)) {
      const data_array: string[] = data_string.slice(separater_length).split(separater)
      if (data_array[0] == 'CLIENT') {
        if (data_array[1] == 'NAME') { // :CLIENT|NAME|chi2|10.10.10.10,12348
          const address: string = data_array[3]!
          if (address_name_dict.hasOwnProperty(address)) {
            up_list_update(address, '')
            up_list_update(address, data_array[2]!)
          } else {
            up_list_update(address, data_array[2]!)
          }
          address_name_dict[address] = data_array[2]!
        } else if (data_array[1] == 'LOGOUT') { // :CLIENT|LOGOUT|10.10.10.10,12348
          const address: string = data_array[2]!
          delete address_name_dict[address]
          up_list_update(address, '')
        } else if (data_array[1] == 'RELAY') { // :CLIENT|RELAY|10.10.10.10,12348|test123|text
          const address: string = data_array[2]!
          data_receive(address_name_dict[address]!, [data_array[3]!, data_array[4]!])
        } else if (data_array[1] == 'DICT') { // :CLIENT|DICT|{"10.10.10.10,12348", "chi2"}
          const address_name_dict_temp: { [index: string]: string } = JSON.parse(data_array[2]!)
          for (const address in address_name_dict_temp) {
            // check if the property/key is defined in the object itself, not in parent
            if (address_name_dict_temp.hasOwnProperty(address)) {
              if (address == 'localhost' || address_name_dict_temp[address] == username) {
                continue
              }

              const temp_name = address_name_dict_temp[address]!
              if (address_name_dict.hasOwnProperty(address)) {
                if (address_name_dict[address] != temp_name) {
                  up_list_update(address, '')
                  up_list_update(address, temp_name)
                }
              } else {
                address_name_dict[address] = temp_name
                up_list_update(address, temp_name)
              }
            }
          }
        }
      } else if (data_array[0] == 'NAME') { // :NAME|chi1
        address_name_dict[server_address_port] = data_array[1]!
        up_list_update(server_address_port, data_array[1]!)
      }
    } else { // test123|text
      data_receive(address_name_dict[server_address_port]!, data_string.split(separater))
    }
  }

  data_send = (content: string, type: string) => {
    socket.write(content + separater + type)
  }

  data_send_raw = (str: string, _exclude: string) => { socket.write(str) }

  socket = connect(port, server_address)
  socket.setNoDelay(true)

  socket.write(separater_special + 'NAME' + separater + username)

  socket.on('data', data_receive_wrapper)

  socket.on('error', function (err) {
    console.log(`Error: ${err}`)
        error_message!.innerText = '网络错误：' + err
  })

  // socket.on('close', function() {
  //     console.log('Connection closed');
  // });
}
