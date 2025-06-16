/*Credit to HasanAbbadi's japsub-api (https://github.com/HasanAbbadi/japsub-api)*/
const cheerio = require("cheerio");

const mainUrl = "https://kitsunekko.net";
/**Gets all kitsunekko anime titles and url's*/
exports.GetKitsunekkoTitles = async function() {
  const leadUrl = "/dirlist.php?dir=subtitles/japanese/&sort=date&order=desc";
  return await FetchTable(leadUrl)
}
/**Gets subtitle url's from a given anime's kitsunekko.net url
 * @param {String} url - the URL to the directory listing, e.g. "https://kitsunekko.net/dirlist.php?dir=subtitles%2Fjapanese%2FKono+Subarashii+Sekai+ni+Bakuen+wo%21%2F"
 * @returns {Promise<Object>} - returns a promise that resolves to an object containing the subtitle objects
 */
exports.GetKitsunekkoSubtitles = async function (url) {
  return await FetchTable(url + '/&sort=date&order=desc').then((data) => {
    let subtitles = []
    for (const subEntry of data) {
      if (!subEntry.name.endsWith(".srt") /*&& !subEntry.name.endsWith(".ass")*/) continue //Only subtitle files
      //add 1000 to the id to avoid 'collision' with other subtitle providers
      subtitles.push({ id: `${subtitles.length + 1001}`, url: subEntry.url, lang: "jpn" });
    }
    return subtitles
  })
}
async function FetchTable(url) {
  const body = await GetBody(mainUrl + url)
  return GetTableData(body)
}
/**Get the html text of a webpage*/
async function GetBody(url) {
  const res = await fetch(url)
  return await res.text()
}

/**Get the first row of a Table containing links in kitsunekko.net*/
function GetTableData(body) {
  const $ = cheerio.load(body)
  const data = []

  $("#flisttable > tbody > tr").each((_, el) => {
    const url = $(el).find("td > a").attr("href")
    if (!url.endsWith(".rar") && !url.endsWith(".7z") && !url.endsWith(".zip")) {//only add if not an archive
      data.push({
        title: $(el).find("td > a > strong").text(), //undefined when getting subtitles
        size: $(el).find("td.tdleft").text().trim(), //undefined when getting titles
        url,
        date: new Date($(el).find("td.tdright").attr("title"))
      })
    }
  })

  return data
}