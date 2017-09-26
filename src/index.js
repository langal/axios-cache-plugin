/*
 * @Filename: index.js
 * @Author: jin5354
 * @Email: xiaoyanjinx@gmail.com
 * @Last Modified time: 2017-06-24 21:07:34
 */
import {Cacher} from './cacher.js'
import {FileCacher} from './fileCacher.js'
import {RedisCacher} from './redisCacher.js'
const parseCacheControl = require('parse-cache-control')


/**
 * [wrapper 包装器]
 * @param  {[axios instance]} instance
 * @param  {[obj]} option
 * @return {[axios instance with cache feature]}
 */
export default function wrapper(instance, option) {

  let cacher

  if (!option.backend) {
    cacher = new Cacher(option)
  } else {
    if (option.backend === 'redis') {
      cacher = new RedisCacher(option)
    } else if (option.backend === 'file') {
      cacher = new FileCacher(option)
    } else {
      cacher = new Cacher(option)
    }
  }

  const unCacheMethods = [
    'delete',
    'head',
    'options',
    'post',
    'put',
    'patch'
  ]

  /**
   * [axiosWithCache axios instance Proxy]
   * @param  {...[any]} arg
   * @return {[promise]}
   */
  function axiosWithCache(...arg) {
    if(arg.length === 1 && (arg[0].method === 'get' || arg[0].method === undefined)) {
      return requestWithCacheCheck(arg[0], instance, ...arg)
    }else {
      return instance(...arg)
    }
  }

  /**
   * [requestWithCacheCheck 对于 get 请求检查缓存，返回结果 promise]
   * @param  {[obj]}    option
   * @param  {[request handler func]}    func
   * @param  {...[any]} arg
   * @return {[promise]}
   */
  function requestWithCacheCheck(option, func, ...arg) {
    if(cacher.needCache(option)) {
      return cacher.hasCache(option).then(function(exists) {
        if (exists) {
          return cacher.getCache(option)
        } else {
          return func(...arg).then(response => {
            /*
              Can read the HTTP headers and status codes here
              to determine whether or not it should be cached, purged, etc.
            */
            if (response.status <= 400) {
                cacher.setCache(option, response)
            } else if (response.status == 304) {
              const cacheConfig = parseCacheControl(response.headers['cache-control'])
              if (cacheConfig['max-age'] > 0) {
                option.ttl = cacheConfig['max-age']
                cacher.setCache(option, response)
              }
            }
            return {data: response.data, status: response.status, statusText: response.statusText, headers: response.headers}
          })
        }
      })
    } else {
      return instance(...arg)
    }
  }

  /**
   * [get axios instance get function proxy]
   * @param  {...[any]} arg
   * @return {[promise]}
   */
  axiosWithCache.get = function(...arg) {
    if(arg.length === 1) {
      return requestWithCacheCheck({
        url: arg[0]
      }, instance.get, ...arg)
    }else if(arg.length === 2) {
      return requestWithCacheCheck({
        url: arg[0],
        ...arg[1]
      }, instance.get, ...arg)
    }else {
      return instance.get(...arg)
    }
  }

  /**
   * [__addFilter cacher instance addFilter function proxy]
   * @param  {[reg]} filter
   */
  axiosWithCache.__addFilter = function(filter) {
    cacher.addFilter(filter)
  }

  /**
   * [__removeFilter cacher instance removeFilter function proxy]
   * @param  {[reg]} filter
   */
  axiosWithCache.__removeFilter = function(filter) {
    cacher.removeFilter(filter)
  }

  /**
   * [cacher instance proxy]
   */
  axiosWithCache.__cacher = cacher

  /**
   * [proxy axios instance functions which are no need to be cached]
   */
  unCacheMethods.forEach(method => {
    axiosWithCache[method] = function(...arg) {
      return instance[method](...arg)
    }
  })

  return axiosWithCache
}
