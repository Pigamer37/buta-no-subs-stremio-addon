require('dotenv').config()

/** 
 * Gets auth headers for Jimaku API requests
 * @return {Object} { "Authorization": process.env.JIMAKU_API_KEY }
 */
GetJimakuAuthToken = function () {
  return { "Authorization": process.env.JIMAKU_API_KEY }
}
const JIMAKU_API_BASE = "https://jimaku.cc/api"
//Only works for Live actions???
exports.GetJimakuEntryFromTMDB = async function (tmdbID) {
  const options = { headers: GetJimakuAuthToken() }
  return fetch(`${JIMAKU_API_BASE}/entries/search?tmdb_id=tv:${tmdbID}`, options).then(HandleJimakuEntryResponse)
}
/**
 * @param {String} aniListID - AniList ID of the anime, like "12345"
 * @returns {Promise<Object>} - returns a promise that resolves to the first result of the search
 */
exports.GetJimakuEntryFromAniList = async function (aniListID) {
  const options = { headers: GetJimakuAuthToken() }
  return fetch(`${JIMAKU_API_BASE}/entries/search?anilist_id=${aniListID}`, options).then(HandleJimakuEntryResponse)
}
/** 
 * Searches for a Jimaku entry by title.
 * @param {String} query - search query, the title 
 * @returns {Promise<Object>} - returns a promise that resolves to the first result of the search
 */
exports.SearchForJimakuEntry = async function (query) {
  const options = { headers: GetJimakuAuthToken() }
  return fetch(`${JIMAKU_API_BASE}/entries/search?query=${query}`, options).then(HandleJimakuEntryResponse)
}

function HandleJimakuEntryResponse(res) {
  if ((!res.ok) || res.status !== 200) throw Error(`HTTP error! Status: ${res.status}`)
  if (res === undefined) throw Error(`Undefined response!`)
  return res.json().then((data) => {
    //console.log("Jimaku search result:", data[0])
    if (data === undefined || !data[0]) throw Error("Invalid response!")
    //send first result
    return data[0]
  })
}
/**
 * Gets the Stremio Subtitle objects for a given Jimaku ID and episode number
 * @param {Number} jimakuID 
 * @param {Number} [episodeNumber] - optional episode number, to refine the query to the API
 * @returns 
 */
exports.GetJimakuFiles = async function (jimakuID, episodeNumber = undefined, seasonNumber = undefined) {
  const options = { headers: GetJimakuAuthToken() }
  const reqURL = episodeNumber ? `${JIMAKU_API_BASE}/entries/${jimakuID}/files?episode=${episodeNumber}` : `${JIMAKU_API_BASE}/entries/${jimakuID}/files`
  //If we have an episode number, we can try to get the files for that episode
  return fetch(reqURL, options).then((resp) => {
    if ((!resp.ok) || resp.status !== 200) throw Error(`HTTP error! Status: ${resp.status}`)
    if (resp === undefined) throw Error(`undefined response!`)
    return resp.json()
  }).then((data) => {
    data = data.filter((subEntry) => {
      return subEntry.name.endsWith(".srt") || subEntry.name.endsWith(".ass") || subEntry.name.endsWith(".ssa") 
        || subEntry.name.endsWith(".vtt") || subEntry.name.endsWith(".ttml") || subEntry.name.endsWith(".sub")
    })
    if (data === undefined || !data[0]) { //See issue #13
      return fetch(`${JIMAKU_API_BASE}/entries/${jimakuID}/files`, options).then((resp) => {
        if ((!resp.ok) || resp.status !== 200) throw Error(`HTTP error! Status: ${resp.status}`)
        if (resp === undefined) throw Error(`undefined response!`)
        return resp.json()
      }).then((data) => {
        if (data === undefined || !data[0]) throw Error("Invalid response!")
        return FilterByEpisode(data, episodeNumber)
      })
    } else return data
    //Parse the data to get the files
  }).then((data) => {
    return ParseJimakuFiles(data, seasonNumber)
  })
}

function ParseJimakuFiles(data, seasonNumber = undefined) {
  //data is an array of files
  if (seasonNumber !== undefined) {
    data.sort((a, b) => {
      //Sort by season number if we have it
      const aSeasonMatch = /([Ss][Ee][Aa][Ss][Oo][Nn]|[Ss]).?([0-9]+)/g.exec(a.name.replace(/[\[\(][0-9A-Za-z\-\,\ \.]*[\]\)]/g,"").replace(/[vV][0-9]+/,"").replace(/\.(txt|md|sup)$/, "").replace(/(1080p|720p|WEBRip|Netflix).*/, "").replace(/[\[\(][0-9]+(\.|-)[0-9]*(\.|-)[0-9]*[\]\)]/, ""));
      const bSeasonMatch = /([Ss][Ee][Aa][Ss][Oo][Nn]|[Ss]).?([0-9]+)/g.exec(b.name.replace(/[\[\(][0-9A-Za-z\-\,\ \.]*[\]\)]/g,"").replace(/[vV][0-9]+/,"").replace(/\.(txt|md|sup)$/, "").replace(/(1080p|720p|WEBRip|Netflix).*/, "").replace(/[\[\(][0-9]+(\.|-)[0-9]*(\.|-)[0-9]*[\]\)]/, ""));
      const aSeason = aSeasonMatch ? parseInt(aSeasonMatch[2]) : 1
      const bSeason = bSeasonMatch ? parseInt(bSeasonMatch[2]) : 1
      
      if (aSeason === seasonNumber && bSeason !== seasonNumber) return -1
      else if (aSeason !== seasonNumber && bSeason === seasonNumber) return 1
      else return aSeason - bSeason //If both have the season number or both don't have it, ascending order
    })
  }
  let subtitles = []
  for (const subEntry of data) {
    if (!subEntry.name.endsWith(".srt") && !subEntry.name.endsWith(".ass") && !subEntry.name.endsWith(".ssa") 
        && !subEntry.name.endsWith(".vtt") && !subEntry.name.endsWith(".ttml") && !subEntry.name.endsWith(".sub")) continue //Only subtitle files
    //We can now respond with the subtitles
    subtitles.push({ id: `${subtitles.length + 1}`, url: subEntry.url, lang: "jpn", label: `Jimaku: ${subEntry.name}` });
  }
  return subtitles;
}

function FilterByEpisode(data, episodeNumber) {
  //data is an array of files, we want to filter by episode number
  return data.filter((subEntry) => {
    //from japsub-api. Clean title from [*], v2, extensions, sources and dates
    const title = subEntry.name.replace(/[\[\(][0-9A-Za-z\-\,\ \.]*[\]\)]/g,"").replace(/[vV][0-9]+/,"").replace(/\.(txt|md|sup)$/, "").replace(/(1080p|720p|WEBRip|Netflix).*/, "").replace(/[\[\(][0-9]+(\.|-)[0-9]*(\.|-)[0-9]*[\]\)]/, "").replace(/([Ss][Ee][Aa][Ss][Oo][Nn]|[Ss]).?[0-9]*/g, "");
    const singleRegex = new RegExp(`[Ee]?(?<![0-9])0?(${episodeNumber})(?![0-9])`, "g");
    const singleMatch = singleRegex.exec(title);
    return singleMatch !== null;
  })
}