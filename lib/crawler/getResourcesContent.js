const superagent = require('superagent');
const asyncjs = require('async');
const logger = require('./../utils/winston');
const parseContent = require('./parseContent');
const config = require('./../../config/config');

/**
 * 根据 url 获取资源内容
 * @param  {array} urls             当前页面的所有子 url
 * @param  {string} urlCurrentPage  当前页面的 url
 * @return {object}                 抓取到的 resource
 */
function getResourcesContent(urls, urlCurrentPage) {
  const results = [];
  return new Promise((resolve) => {
    // 创建队列
    const queue = asyncjs.queue((url, callback) => {
      // 开始记录抓取某个资源的耗时
      console.time(`[resource] 抓取 ${url} 耗时`);
      superagent.get(url)
        .set('User-Agent', config.userAgent)
        .timeout(config.timeout)
        .end((error, res) => {
          if (error) {
            // 抓取出错
            logger.error(`${new Date()} [抓取 ${url} 出错]: ${error.message}`);
            callback(error);
            return false;
          }
          try {
            // 抓取成功，分析页面
            const resource = parseContent(res.text);
            resource.urlPanduoduo = url;
            resource.urlCurrentPage = urlCurrentPage;
            callback(null, resource);
          } catch (e) {
            // 抓取出错
            logger.error(`${new Date()} [抓取 ${url} 出错]: 没有该页面的内容，${e.stack}`);
            callback(error);
          }
        });
    }, config.moseContent);

    // 循环 urls 中的所有 url
    urls.forEach((url) => {
      // console.log('url: ', url);
      queue.push(url, (error, res) => {
        console.timeEnd(`[resource] 抓取 ${url} 耗时`);
        if (error) {
          // console.log('error: ', error);
          // 抓取某条数据出错
          logger.error(`${new Date()} [error-resuorce]: ${url} ${error.message}`);
          // return reject(error);
          return false;
        }
        // console.log('res: ', res);
        results.push(res);
        // 抓取某条数据完毕
        logger.warn(`${new Date()} [finish-resuorce]: ${url}`);
      });
    });

    queue.drain = () => {
      resolve(results);
    };
  });
}


module.exports = getResourcesContent;
