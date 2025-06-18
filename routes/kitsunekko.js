/*Credit to HasanAbbadi's japsub-api (https://github.com/HasanAbbadi/japsub-api)*/
const cheerio = require("cheerio");
const fsPromises = require("fs/promises");
const fuzzySort = require("fuzzysort");

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
  return GetKitsunekkoTitles().then((kitsunekkoTitles) => {
    title = title.replace(/\d+$/, "").trim()
    const foundAnime = fuzzySort.go(title, kitsunekkoTitles, {
      key: 'title',
      limit: 1, //Limit to 5 results, because of some dupes in the titles, the best one will be [0]
      threshold: .5 //Lower threshold for better matches, but may return more results
    })
    if (!foundAnime[0]) throw Error("No kitsunekko anime found with title: " + title)
    else {
      console.log(`\x1b[36mFound a kitsunekko title for \x1b[39m"${title}": ${foundAnime[0].obj?.title}`)
      return foundAnime[0].obj
    }
  })
}
/**Gets all kitsunekko anime titles and url's from "cache"*/
GetKitsunekkoTitles = async function () {
  return fsPromises.readFile('./kitsunekko_titles.json').then((data) => JSON.parse(data)).catch((err) => {
    console.error('\x1b[31mFailed reading kitsunekko titles cache:\x1b[39m ' + err)
    return GetKitsunekkoTitlesFromWeb() //If the file doesn't exist, get the titles from the web
  })
}
/**Gets all kitsunekko anime titles and url's from the web*/
GetKitsunekkoTitlesFromWeb = async function () {
  const leadUrl = "/dirlist.php?dir=subtitles/japanese/&sort=date&order=desc";
  return FetchTable(leadUrl).then((data) => {
    data.forEach((title) => { title.url = title.url.replace("/dirlist.php?dir=subtitles%2Fjapanese%2F", "") })
    return data
  })
}
//from japsub-api
function checkSeason(sub, season) {
  const singleRegex = new RegExp(`([Ss][Ee][Aa][Ss][Oo][Nn]|S).?${season}`);
  const singleMatch = singleRegex.exec(sub);
  //if we find S3, season 3, etc, or we don't find it but the season is 1 (sometimes on first seasons the number isn't included) or we don't get a season number
  if (singleMatch || (singleMatch === null && season == 1) || !season) return true;
  return false;
}
//from japsub-api
function checkEpisode(sub, episode) {
  //remove season number
  sub = sub.replace(/([Ss][Ee][Aa][Ss][Oo][Nn]|[Ss]).?[0-9]*/g, "");
  const singleRegex = new RegExp(`[Ee]?(?<![0-9])0?(${episode})(?![0-9])`, "g");
  const singleMatch = singleRegex.exec(sub);
  /*//for matching files with episode ranges, like "Kono Subarashii Sekai ni Bakuen wo! - 01-03", which are usually archives
  const regionRegex = new RegExp("([0-9]*)(-|~)([0-9]*)", "g");
  const regionMatch = regionRegex.exec(sub);
  if (regionMatch && regionMatch[1] && regionMatch[3]) {
    if (regionMatch[3] >= episode && regionMatch[1] <= episode) return true;
    return false;
  }*/
  if (singleMatch || !episode) return true;
}
/**Gets subtitle url's from a given anime's kitsunekko.net url
 * @param {String} url - the URL to the directory listing, e.g. "https://kitsunekko.net/dirlist.php?dir=subtitles%2Fjapanese%2FKono+Subarashii+Sekai+ni+Bakuen+wo%21%2F"
 * @returns {Promise<Object>} - returns a promise that resolves to an object containing the subtitle objects
 */
exports.GetKitsunekkoSubtitles = async function (url, episodeNumber = undefined, seasonNumber = undefined) {
  return await FetchTable("/dirlist.php?dir=subtitles%2Fjapanese%2F" + url + '/&sort=date&order=desc').then((data) => {
    let subtitles = []
    //from japsub-api
    let filteredData = data.filter((el) => {
      //Clean title from extensions, sources and dates
      const title = el.title.replace(/.*\.(txt|md|sup)$/, "").replace(/(1080p|720p|WEBRip|Netflix).*/, "").replace(/[\[\(][0-9]+(\.|-)[0-9]*(\.|-)[0-9]*[\]\)]/, "")
      return checkSeason(title, seasonNumber) && checkEpisode(title, episodeNumber)
    })
    for (const subEntry of filteredData) {
      if (!subEntry.title.endsWith(".srt") /*&& !subEntry.name.endsWith(".ass")*/) continue //Only subtitle files
      //add 1000 to the id to avoid 'collision' with other subtitle providers
      subtitles.push({ id: `${subtitles.length + 1001}`, url: "https://kitsunekko.net/" + subEntry.url, lang: "jpn" });
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
  const $ = cheerio.load(body) //decodeEntities: false to keep the HTML entities like &amp; in the text
  /*console.log("Loaded body:", body)
  console.log("Loaded cheerio:", $.html())*/
  const data = []

  $("#flisttable > tbody > tr").each((_, el) => {
    const url = $(el).find("td > a").attr("href").replaceAll("//", "/") //replace double slashes (don't know why they appear when making the request through fetch) with a single slash
    if (!url.endsWith(".rar") && !url.endsWith(".7z") && !url.endsWith(".zip")) {//only add if not an archive
      data.push({
        title: $(el).find("td > a > strong").text(),
        size: $(el).find("td.tdleft").text().trim(), //undefined when getting titles
        url,
        date: new Date($(el).find("td.tdright").attr("title"))
      })
    }
  })

  return data
}