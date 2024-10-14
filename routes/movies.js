/*
███╗   ███╗ ██████╗ ██╗   ██╗██╗███████╗███████╗
████╗ ████║██╔═══██╗██║   ██║██║██╔════╝██╔════╝
██╔████╔██║██║   ██║██║   ██║██║█████╗  ███████╗
██║╚██╔╝██║██║   ██║╚██╗ ██╔╝██║██╔══╝  ╚════██║
██║ ╚═╝ ██║╚██████╔╝ ╚████╔╝ ██║███████╗███████║
╚═╝     ╚═╝ ╚═════╝   ╚═══╝  ╚═╝╚══════╝╚══════╝
*/

import express from 'express';
import axios from 'axios';
import logger from '../utils/logger.js';
import { URLs, options } from '../config/constants.js';

const router = express.Router();

/* =============================================== */
/*                  Trending movies                */
/* =============================================== */
router.get("/trending/movies/:time_window?", async (request, response) => {
    const time_window = request.params.time_window || 'week';

    // Validate that the time_window is either 'week' or 'day'
    const allowedValues = ['week', 'day'];

    if (!allowedValues.includes(time_window)) {
        return response.status(400).send({
            error: `Invalid time_window value: "${time_window}". Allowed values are: ${allowedValues.join(", ")}`
        });
    }

    try {
        const url = `${URLs.tmdb}/trending/movie/${time_window}?language=en-US`;

        const trending = await axios.get(url, options);
        const trendingData = trending.data.results;

        const modifiedTrendingData = trendingData.map(movie => ({
            ...movie,
            backdrop_path: movie.backdrop_path ? URLs.image + movie.backdrop_path : null,
            poster_path: movie.poster_path ? URLs.image + movie.poster_path : null
        }));

        logger.info(`Successfully fetched trending movies at ${new Date().toISOString()}`);
        response.send(modifiedTrendingData);
    } catch (err) {
        handleError(err, response);
    }
});

/* =============================================== */
/*                  Popular movies                 */
/* =============================================== */
router.get("/popular/movies", async (request, response) => {
    try {
        const url = `${URLs.tmdb}/movie/popular?language=en-US&page=1`;

        const popular = await axios.get(url, options);
        const popularData = popular.data.results;

        const popularMovieArray = popularData.slice(0, 20).map(movie => ({
            id: movie.id,
            original_language: movie.original_language,
            original_title: movie.original_title,
            title: movie.title,
            overview: movie.overview,
            backdrop_path: URLs.image + movie.backdrop_path,
            poster_path: URLs.image + movie.poster_path,
            release_date: movie.release_date,
            vote_average: movie.vote_average
        }));

        logger.info(`Successfully fetched popular movies at ${new Date().toISOString()}`);
        response.send(popularMovieArray);
    } catch (err) {
        handleError(err, response);
    }
});

/* =============================================== */
/*                  Upcoming movies                */
/* =============================================== */
router.get("/upcoming/movies", async (request, response) => {
    try {
        const url = `${URLs.tmdb}/movie/upcoming?language=en-US&page=1`;

        const upcoming = await axios.get(url, options);
        const upcomingData = upcoming.data.results;

        const upcomingMovieArray = upcomingData.slice(0, 20).map(movie => ({
            id: movie.id,
            original_language: movie.original_language,
            original_title: movie.original_title,
            overview: movie.overview,
            title: movie.title,
            backdrop_path: URLs.image + movie.backdrop_path,
            poster_path: URLs.image + movie.poster_path,
            release_date: movie.release_date,
            vote_average: movie.vote_average
        }));

        logger.info(`Successfully fetched upcoming movies at ${new Date().toISOString()}`);
        response.send(upcomingMovieArray);
    } catch (err) {
        handleError(err, response);
    }
});

/* ============================================== */
/*                  Search Movie                  */
/* ============================================== */
router.get("/search/movies", async (request, response) => {
    const { query } = request.query;

    // Fixed parameters for every request
    const fixedParams = {
        include_adult: 'false',
        language: 'en-US',
        page: 1
    };

    const queryParams = new URLSearchParams({
        ...fixedParams,
        query: query || ''
    }).toString();

    try {
        const searchMovieUrl = `${URLs.tmdb}/search/movie?${queryParams}`;
        const searchMovie = await axios.get(searchMovieUrl, options);
        const searchMovieData = searchMovie.data.results;

        const searchedMovieArray = searchMovieData.slice(0, 20).map(movie => ({
            id: movie.id,
            original_language: movie.original_language,
            original_title: movie.original_title,
            overview: movie.overview,
            title: movie.title,
            backdrop_path: URLs.image + movie.backdrop_path,
            poster_path: URLs.image + movie.poster_path,
            release_date: movie.release_date,
            vote_average: movie.vote_average
        }));

        logger.info(`Successfully fetched movies for query "${query}" at ${new Date().toISOString()}`);
        response.send(searchedMovieArray);
    } catch (err) {
        handleError(err, response);
    }
});

/* =============================================================== */
/*                  Fetch images of a movie by ID                  */
/* =============================================================== */
router.get("/images/movie/:id", async (request, response) => {
    const movieId = request.params.id;

    try {
        const fetchMovieImagesUrl = `${URLs.tmdb}/movie/${movieId}/images`;
        const fetchedImages = await axios.get(fetchMovieImagesUrl, options);
        const fetchedImagesData = fetchedImages.data;

        const backdropsArray = fetchedImagesData.backdrops?.slice(0, 30).map(backdrop => ({
            aspect_ratio: backdrop.aspect_ratio,
            height: backdrop.height,
            width: backdrop.width,
            file_path: URLs.image + backdrop.file_path
        })) || []; // Fallback to an empty array

        const postersArray = fetchedImagesData.posters?.slice(0, 30).map(poster => ({
            aspect_ratio: poster.aspect_ratio,
            height: poster.height,
            width: poster.width,
            file_path: URLs.image + poster.file_path
        })) || []; // Fallback to an empty array

        logger.info(`Successfully fetched images for movie ID: "${movieId}" at ${new Date().toISOString()}`);
        response.send({ backdrops: backdropsArray, posters: postersArray });
    } catch (err) {
        handleError(err, response);
    }
});

/* ============================================ */
/*                 Handle Error                 */
/* ============================================ */
function handleError(err, response) {
    if (err.response) {
        logger.error(`API Error: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
        response.status(err.response.status).send("Error fetching data from API.");
    } else if (err.request) {
        logger.error('No response received from API:', err.request);
        response.status(500).send("No response received from API.");
    } else {
        logger.error(`Error: ${err.message}`);
        response.status(500).send("Internal Server Error.");
    }
}

export default router;
