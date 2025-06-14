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
  return fetch(`${JIMAKU_API_BASE}/entries/search?tmdb_id=tv:${tmdbID}`, options).then((resp) => {
    if ((!resp.ok) || resp.status !== 200) throw Error(`HTTP error! Status: ${resp.status}`)
    if (resp === undefined) throw Error(`Undefined response!`)
    return resp.json()
  }).then((data) => {
    if (data === undefined || !data[0]) throw Error("Invalid response!")
    //should only be one result
    return data[0]
  })
}
/**
 * @param {String} aniListID - AniList ID of the anime, like "12345"
 * @returns {Promise<Object>} - returns a promise that resolves to the first result of the search
 */
exports.GetJimakuEntryFromAniList = async function (aniListID) {
  const options = { headers: GetJimakuAuthToken() }
  return fetch(`${JIMAKU_API_BASE}/entries/search?anilist_id=${aniListID}`, options).then((resp) => {
    if ((!resp.ok) || resp.status !== 200) throw Error(`HTTP error! Status: ${resp.status}`)  
    if (resp === undefined) throw Error(`Undefined response!`)
    return resp.json()
  }).then((data) => {
    if (data === undefined || !data[0]) throw Error("Invalid response!")
    //should only be one result
    return data[0]
  })
}
/** 
 * Searches for a Jimaku entry by title.
 * @param {String} query - search query, the title 
 * @returns {Promise<Object>} - returns a promise that resolves to the first result of the search
 */
exports.SearchForJimakuEntry = async function (query) {
  const options = { headers: GetJimakuAuthToken() }
  return fetch(`${JIMAKU_API_BASE}/entries/search?query=${query}`, options).then((resp) => {
    if ((!resp.ok) || resp.status !== 200) throw Error(`HTTP error! Status: ${resp.status}`)
    if (resp === undefined) throw Error(`Undefined response!`)
    return resp.json()
  }).then((data) => {
    //console.log("Jimaku search result:", data[0])
    if (data === undefined || !data[0]) throw Error("Invalid response!")
    //send first result
    return data[0]
  })
}
/**
 * 
 * @param {Number} jimakuID 
 * @returns 
 */
exports.GetJimakuFiles = async function (jimakuID) {
  const options = { headers: GetJimakuAuthToken() }
  return fetch(`${JIMAKU_API_BASE}/entries/${jimakuID}/files`, options).then((resp) => {
    if ((!resp.ok) || resp.status !== 200) throw Error(`HTTP error! Status: ${resp.status}`)
    if (resp === undefined) throw Error(`undefined response!`)
    return resp.json()
  }).then((data) => {
    if (data === undefined || !data[0]) throw Error("Invalid response!")
    //Parse the data to get the files
    return ParseJimakuFiles(data)
  })
}

function ParseJimakuFiles(data) {
  //data is an array of files
  let subtitles = []
  for (let i = 0; i < data.length; i++) {
    let subEntry = data[i];
    if (!subEntry.name.endsWith(".srt") && !subEntry.name.endsWith(".ass")) continue //Only subtitle files
    //We can now respond with the subtitles
    subtitles.push({ id: `${i+1}`, url: subEntry.url, lang: "ja" });
  }
  return { subtitles: subtitles, message: "Got Japanese subtitles" };
}