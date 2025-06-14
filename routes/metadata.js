require('dotenv').config()

/** 
 * Gets auth headers for TMDB API requests
 * @return {Object} { "Authorization": `Bearer ${process.env.TMDB_API_READ_TOKEN}` }
 */
GetTMDBAuthToken = function () {
  return { "Authorization": `Bearer ${process.env.TMDB_API_READ_TOKEN}` }
}
const TMDB_API_BASE = "https://api.themoviedb.org/3"
const CINEMETA_BASE = "https://v3-cinemeta.strem.io"

/**
 * Requests metadata from TMDB
 * @param {String} imdbID - IMDB item ID like "tt29623480"
 * @param {String} [lang=undefined] - optional language code for query
 * @returns {Promise<Object>} array of metadata objects or movie items
 */
exports.GetTMDBMeta = function (imdbID, lang = undefined) {
  const reqURL = (lang === undefined) ?
    `${TMDB_API_BASE}/find/${imdbID}?external_source=imdb_id` :
    `${TMDB_API_BASE}/find/${imdbID}?external_source=imdb_id&language=${lang}`;
  const options = { headers: GetTMDBAuthToken() }
  return new Promise((resolve, reject) => {
    fetch(reqURL, options).then((resp) => {
      if ((!resp.ok) || resp.status !== 200) reject(new Error(`HTTP error! Status: ${resp.status}`))
      if (resp === undefined) reject(new Error(`undefined response!`))
      return resp.json()
    }).then((data) => {
      if ((data === undefined) || (data.movie_results.length < 1)) reject(new Error("Invalid response!"))
      resolve(ParseTMDBMeta(data.movie_results, imdbID))
    }).catch(e => {
      reject(e)
    })
  })
}
/**
 * Parses TMDB metadata to standardize in this app
 * @param {Array} resultsArray - movie_results array from JSON TMDB response
 * @param {String} imdbID - IMDB item ID
 * @returns {Object} Parsed and standardised metadata
 */
function ParseTMDBMeta(resultsArray, imdbID) {
  const first_item = resultsArray[0]
  return {
    imdbID: imdbID,
    tmdbID: first_item.id,
    type: first_item.media_type,
    title: first_item.title,
    summary: first_item.overview,
    releaseDate: Date(first_item.release_date),
    adult: first_item.adult
  }
}
/**
 * Requests metadata from the Cinemeta Stremio Addon
 * @param {String} imdbID - IMDB item ID like "tt29623480"
 * @param {String} [type=movie] - optional item type for query
 * @returns {Promise<Object>} array of metadata objects or movie items
 */
exports.GetCinemetaMeta = function (imdbID, type = "movie") {
  const reqURL = `${CINEMETA_BASE}/meta/${type}/${imdbID}.json`
  return new Promise((resolve, reject) => {
    fetch(reqURL).then((resp) => {
      if ((!resp.ok) || resp.status !== 200) reject(new Error(`HTTP error! Status: ${resp.status}`))
      if (resp === undefined) reject(new Error(`undefined response!`))
      return resp.json()
    }).then((data) => {
      if (data?.meta === undefined) reject(new Error("Invalid response!"))
      resolve(ParseCinemetaMeta(data.meta))
    }).catch(e => {
      reject(e)
    })
  })
}
/**
 * Parses Cinemta metadata to standardize in this app
 * @param {Object} meta - movie_results array from JSON TMDB response
 * @returns {Object} Parsed and standardised metadata
 */
function ParseCinemetaMeta(meta) {
  return {
    imdbID: meta.imdb_id,
    tmdbID: meta.moviedb_id,
    type: meta.type,
    title: meta.name,
    summary: meta.description,
    releaseDate: Date(meta.released)
  }
}