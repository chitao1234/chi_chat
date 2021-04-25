const { BrowserWindow, dialog } = require('electron').remote;

const mainWindow = BrowserWindow.getFocusedWindow();

function get_datetime() {
    let date = new Date();
    let milisecond = String(date.getMilliseconds()).padStart(3, '0');
    let second = String(date.getSeconds()).padStart(2, '0');
    let minute = String(date.getMinutes()).padStart(2, '0');
    let hour = String(date.getHours()).padStart(2, '0');
    let day = String(date.getDate()).padStart(2, '0');
    let month = String(date.getMonth() + 1).padStart(2, '0');
    let year = date.getFullYear();
    let datetime = year + '/' + month + '/' + day + ' ' + hour + ':' + minute + ':' + second + '.' + milisecond;
    return datetime;
}