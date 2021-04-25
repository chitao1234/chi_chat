var form = document.getElementById('message_send');
var input_area = document.getElementById('input_area');
var message_area = document.getElementById('message_area');
var image_select = document.getElementById('image_select');
var error_message = document.getElementById('error_message');
var up_list = document.getElementById('up_list');
var username = '';

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
    document.getElementById('menu_bar').removeChild(document.getElementById('username_wrapper'));
    document.getElementById('username_label').innerText += username;
    up_list_update('localhost', username);
});