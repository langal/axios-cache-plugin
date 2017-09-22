/*
 * @Filename: cacher.js
 * @Author: jin5354
 * @Email: xiaoyanjinx@gmail.com
 * @Last Modified time: 2017-06-24 21:14:25
 */

const redis = require('redis')
let self

export class RedisCacher {

  constructor(option) {
    this.option = option || {}
    this.maxCacheSize = this.option.maxCacheSize || 15
    this.ttl = this.option.ttl || 3600
    this.filters = []
    this.excludeHeaders = this.option.excludeHeaders || false
    this.redisClient = redis.createClient();
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
    self.redisClient.set(this.getCacheKey(key), JSON.stringify(response), 'EX', self.ttl)
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
    return new Promise((resolve, reject) => {
      self.redisClient.exists(this.getCacheKey(key), (err,data)=>{resolve(data)})
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
    return this._readCache(this.getCacheKey(key)).then(function(data) {return JSON.parse(data)})
  }

  _readCache(key) {
    return new Promise((resolve, reject) => {
      self.redisClient.get(key, (err, data) => {
        if (err) { reject(err) }
        resolve(data)
      })
    })
  }

}
