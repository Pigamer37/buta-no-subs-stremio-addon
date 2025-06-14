require('dotenv').config()

/** 
 * Gets auth headers for TMDB API requests
 * @return {Object} { "Authorization": `Bearer ${process.env.TMDB_API_READ_TOKEN}` }
 */
GetJimakuAuthToken = function () {
  return { "Authorization": process.env.JIMAKU_API_KEY }
}
const JIMAKU_API_BASE = "https://jimaku.cc/api"

exports.GetJimakuId = async function (tmdbID) {
  const options = { headers: GetJimakuAuthToken() }
  return fetch(`${JIMAKU_API_BASE}/entries/search?tmdb_id=tv:${tmdbID}`).then((resp) => {
    if ((!resp.ok) || resp.status !== 200) reject(new Error(`HTTP error! Status: ${resp.status}`))
    if (resp === undefined) reject(new Error(`undefined response!`))
    return resp.json()
  }).then((data) => {
    if (data === undefined) reject(new Error("Invalid response!"))
  })
}