/*
 * @Filename: cacher.js
 * @Author: jin5354
 * @Email: xiaoyanjinx@gmail.com
 * @Last Modified time: 2017-06-24 21:14:25
 */

const fs = require('fs')
let self

export class FileCacher {

  constructor(option) {
    this.cacheMap = new Map()
    this.option = option || {}
    this.maxCacheSize = this.option.maxCacheSize || 15
    this.ttl = this.option.ttl || 3600
    this.filters = []
    this.excludeHeaders = this.option.excludeHeaders || false
    self = this
  }

  /**
   * [addFilter 添加匹配规则]
   * @param {[reg]} reg
   */
  addFilter(reg) {
    this.filters.push(reg)
  }

  /**
   * [removeFilter 移除匹配规则]
   * @param  {[reg]} reg
   */
  removeFilter(reg) {
    let index = this.filters.indexOf(reg)
    if(index !== -1) {
      this.filters.splice(index, 1)
    }
  }

  /**
   * [setCache 添加缓存]
   * @param {[any]} key
   * @param {[any]} value
   */
  setCache(key, value) {
    if(this.excludeHeaders) delete key.headers
    const response = {data: value.data, status: value.status, statusText: value.statusText, headers: value.headers}

    const filePath = '/tmp/' + this.getCacheKey(key)
    fs.writeFile(filePath, JSON.stringify(response), function(err) {
      if (err) {
        return console.error(err);
      }
    })
  }

  /**
   * [needCache 检查是否命中匹配规则]
   * @param  {[obj]} option
   * @return {[boolean]}
   */
  needCache(option) {
    /* put http headers check here */
    return this.filters.some(reg => {
      return reg.test(option.url)
    })
  }

  /**
   * [hasCache 是否已有缓存]
   * @param  {[any]}  key
   * @return {Boolean}
   */
  hasCache(key) {
    const filePath = '/tmp/' + this.getCacheKey(key)
    return new Promise((resolve, reject) => {
      fs.exists(filePath, function(exists) {
        if (exists === true) {
          fs.stat(filePath, function(err, stats) {
            let secondsAgo = (new Date().getTime() - stats.mtime) / 1000
            if (self.ttl > secondsAgo) {
              resolve(true)
            } else {
              fs.unlink(filePath);
            }
          })
        } else {
          resolve(false)
        }
      })
    })
  }

  getCacheKey(key) {
    return encodeURIComponent('axios_cache_' + key.url)
  }

  /**
   * [getCache 获取缓存内容]
   * @param  {[any]} key
   * @return {[any]}
   */
  getCache(key, cb) {
    const filePath = '/tmp/' + this.getCacheKey(key)
    return this._readFile(filePath).then(function(data) {return JSON.parse(data)})
  }

  _readFile(filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) { reject(err) }
        resolve(data)
      })
    })
  }
}
