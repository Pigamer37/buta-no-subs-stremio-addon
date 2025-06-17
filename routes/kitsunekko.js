/*Credit to HasanAbbadi's japsub-api (https://github.com/HasanAbbadi/japsub-api)*/
const cheerio = require("cheerio");
const fsPromises = require("fs/promises");

const mainUrl = "https://kitsunekko.net";

exports.UpdateKitsunekkoTitleFile = function () {
  return GetKitsunekkoTitlesFromWeb().then((titles) => {
    console.log(`\x1b[36mGot ${titles.length} kitsunekko titles\x1b[39m, saving to kitsunekko_titles.json`)
    return fsPromises.writeFile('./kitsunekko_titles.json', JSON.stringify(titles, (key, val) => {
      return ((key === "date") || (key === "size")) ? undefined : val //Remove date and size from the JSON file, as they are not needed for the titles
    }))
  }).catch((err) => {
    console.error('\x1b[31mFailed "caching" kitsunekko titles:\x1b[39m ' + err)
    throw err
  })
}
exports.SearchForKitsunekkoEntry = async function (title) {
  return kitsunekkoAPI.GetKitsunekkoTitles().then((kitsunekkoTitles) => {
    //TODO: fuzzy sort
    let foundAnime = kitsunekkoTitles.find((el) => el.title === title)
    if (!foundAnime) throw Error("No kitsunekko anime found with title: " + title)
    else return foundAnime
  })
}
/**Gets all kitsunekko anime titles and url's from "cache"*/
GetKitsunekkoTitles = async function () {
  return fsPromises.readFile('./kitsunekko_titles.json').catch((err) => {
    console.error('\x1b[31mFailed reading kitsunekko titles cache:\x1b[39m ' + err)
    return GetKitsunekkoTitlesFromWeb() //If the file doesn't exist, get the titles from the web
  })
}
/**Gets all kitsunekko anime titles and url's from the web*/
GetKitsunekkoTitlesFromWeb = async function () {
  const leadUrl = "/dirlist.php?dir=subtitles/japanese/&sort=date&order=desc";
  return await FetchTable(leadUrl)
}
/**Gets subtitle url's from a given anime's kitsunekko.net url
 * @param {String} url - the URL to the directory listing, e.g. "https://kitsunekko.net/dirlist.php?dir=subtitles%2Fjapanese%2FKono+Subarashii+Sekai+ni+Bakuen+wo%21%2F"
 * @returns {Promise<Object>} - returns a promise that resolves to an object containing the subtitle objects
 */
exports.GetKitsunekkoSubtitles = async function (url) {
  return await FetchTable("/dirlist.php?dir=subtitles%2Fjapanese%2F" + url + '/&sort=date&order=desc').then((data) => {
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
        url: url.replace("/dirlist.php?dir=subtitles%2Fjapanese%2F", ""),
        date: new Date($(el).find("td.tdright").attr("title"))
      })
    }
  })

  return data
}