BORIS Web App
=============

This is a web application designed to deliver apocalypse-preparation training
activities to participants.

Installation
------------

1. Install Node.js version 8.7 or newer
1. Install [Docker|https://www.docker.com/]
1. Clone this repository


Running a local development environment
---------------------------------------

If you use Visual Studio Code, just open this repository.

1. First, start the database servers. Choose Tasks > Run Task > "Run Database Servers"
1. If this is the first time running BORIS, apply the migrations: Choose Tasks > Run Task >
   "Apply database migrations".
1. Hit F5 to run the backend server
1. Choose Tasks > Run Build Task to build the frontend (and re-build it upon any changes).

Go to http://localhost:3333/ to see the results.
