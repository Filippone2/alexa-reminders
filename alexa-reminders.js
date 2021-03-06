var request = require('request')
var Nightmare = require('nightmare')
var nightmare = Nightmare({ show: false })
var dateFormat = require('dateformat')

var login = function(deviceName, userName, password, callback) {
  var devicesArray = []
  var cookiesArray = []
  var deviceSerialNumber
  var deviceType
  var strCookies  = ''
  var csrf = ''
  var config = {}

  nightmare
    .goto('https://www.amazon.com/ap/signin?showRmrMe=1&openid.return_to=https%3A%2F%2Falexa.amazon.com%2Fspa%2Findex.html&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=amzn_dp_project_dee&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&')
    .type('#ap_email', userName)
    .type('#ap_password', password)
    .click('#signInSubmit')
    .wait(1000)
    .goto('https://alexa.amazon.com/api/devices-v2/device')
    .wait()
    .evaluate(function() {
      return JSON.parse(document.body.innerText)
    })
    .then(function(result) {
      devicesArray = result
    })
    .then(function() {
    return nightmare
      .cookies.get({
        url: null
      })
      .end()
      .then(cookies => {
        cookiesArray = cookies
      })
    })
    .then(function() {
      cookiesArray.forEach(function(cookie) {
        strCookies += cookie.name + '=' + cookie.value + '; '
        if (cookie.name === 'csrf'){
          csrf = cookie.value
        }
      })
      devicesArray.devices.forEach(function(dev) {
        if (dev.accountName.toLowerCase() === deviceName.toLowerCase()){
          deviceSerialNumber = dev.serialNumber
          deviceType = dev.deviceType
        }
      })
      config.cookies = strCookies
      config.csrf = csrf
      config.deviceSerialNumber = deviceSerialNumber
      config.deviceType = deviceType
      callback(null, 'Logged in', config)
    })
    .catch(function(error) {
      callback(error, 'There was an error', null)
    })
}

var setReminder = function(message, datetime, config, callback) {
    var now = new Date()
    var createdDate = now.getTime()
    var addSeconds = new Date(createdDate + 1*60000) // one minute afer the current time
    var alarmTime = addSeconds.getTime()
    if (datetime) {
      var datetimeDate = new Date(dateFormat(datetime))
      alarmTime = datetimeDate.getTime()
    }
    var originalTime = dateFormat(alarmTime, 'HH:MM:00.000')
    var originalDate = dateFormat(alarmTime, 'yyyy-mm-dd')

    request({
      method: 'PUT',
      url: 'https://alexa.amazon.com/api/notifications/createReminder',
      headers: {
        'Cookie': config.cookies,
        'csrf': config.csrf
      },
      json: {
        type: 'Reminder',
        status: 'ON',
        alarmTime: alarmTime,
        originalTime: originalTime,
        originalDate: originalDate,
        timeZoneId: null,
        reminderIndex: null,
        sound: null,
        deviceSerialNumber: config.deviceSerialNumber,
        deviceType: config.deviceType,
        recurringPattern: '',
        reminderLabel: message,
        isSaveInFlight: true,
        id: 'createReminder',
        isRecurring: false,
        createdDate: createdDate
      }
    }, function(error, response, body) {
      if(!error && response.statusCode === 200) {
        callback(null, 'Your reminder "' + message + '" was created')
      } else {
        callback(error, 'There was an error')
      }
    })
}

exports.login = login
exports.setReminder = setReminder
