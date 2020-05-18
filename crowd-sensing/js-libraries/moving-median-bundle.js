require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"moving-median":[function(require,module,exports){
'use strict'

module.exports = createMedianFilter

function createMedianFilter(length) {
  var buffer   = new Float64Array(length)
  var history  = new Int32Array(length)
  var counter  = 0
  var bufCount = 0
  function insertItem(x) {
    var nextCounter = counter++
    var oldCounter  = nextCounter - length

    //First pass:  Remove all old items
    var ptr = 0
    for(var i=0; i<bufCount; ++i) {
      var c = history[i]
      if(c <= oldCounter) {
        continue
      }
      buffer[ptr] = buffer[i]
      history[ptr] = c
      ptr += 1
    }
    bufCount = ptr

    //Second pass:  Insert x
    if(!isNaN(x)) {
      var ptr = bufCount
      for(var j=bufCount-1; j>=0; --j) {
        var y = buffer[j]
        if(y < x) {
          buffer[ptr] = x
          history[ptr] = nextCounter
          break
        }
        buffer[ptr] = y
        history[ptr] = history[j]
        ptr -= 1
      }
      if(j < 0) {
        buffer[0]  = x
        history[0] = nextCounter
      }
      bufCount += 1
    }

    //Return median
    if(!bufCount) {
      return NaN
    } else if(bufCount & 1) {
      return buffer[bufCount>>>1]
    } else {
      var mid = bufCount>>>1
      return 0.5*(buffer[mid-1] + buffer[mid])
    }
  }
  return insertItem
}

},{}]},{},[]);
