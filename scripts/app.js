(function () {
    'use strict';

    var app = {
        isLoading: true,
        visibleCards: {},
        selectedTimetables: [],
        spinner: document.querySelector('.loader'),
        cardTemplate: document.querySelector('.cardTemplate'),
        container: document.querySelector('.main'),
        addDialog: document.querySelector('.dialog-container')
    };


    /*****************************************************************************
     *
     * Event listeners for UI elements
     *
     ****************************************************************************/

    document.getElementById('butRefresh').addEventListener('click', function () {
        // Refresh all of the forecasts
        app.updateSchedules();
    });

    document.getElementById('butAdd').addEventListener('click', function () {
        // Open/show the add new city dialog
        app.toggleAddDialog(true);
    });

    document.getElementById('butAddCity').addEventListener('click', function () {


        var select = document.getElementById('selectTimetableToAdd');
        var selected = select.options[select.selectedIndex];
        var key = selected.value;
        var label = selected.textContent;
        if (!app.selectedTimetables) {
            app.selectedTimetables = [];
        }
        app.getSchedule(key, label);
        app.selectedTimetables.push({key: key, label: label});
        app.saveSelectedTimetables();
        app.toggleAddDialog(false);
    });

    document.getElementById('butAddCancel').addEventListener('click', function () {
        // Close the add new city dialog
        app.toggleAddDialog(false);
    });


    /*****************************************************************************
     *
     * Methods to update/refresh the UI
     *
     ****************************************************************************/

    // Toggles the visibility of the add new city dialog.
    app.toggleAddDialog = function (visible) {
        if (visible) {
            app.addDialog.classList.add('dialog-container--visible');
        } else {
            app.addDialog.classList.remove('dialog-container--visible');
        }
    };

    // Updates a weather card with the latest weather forecast. If the card
    // doesn't already exist, it's cloned from the template.

    app.updateTimetableCard = function (data) {
        var key = data.key;
        var dataLastUpdated = new Date(data.created);
        var schedules = data.schedules;
        var card = app.visibleCards[key];

        if (!card) {
            var label = data.label.split(', ');
            var title = label[0];
            var subtitle = label[1];
            card = app.cardTemplate.cloneNode(true);
            card.classList.remove('cardTemplate');
            card.querySelector('.label').textContent = title;
            card.querySelector('.subtitle').textContent = subtitle;
            card.removeAttribute('hidden');
            app.container.appendChild(card);
            app.visibleCards[key] = card;
        }
        card.querySelector('.card-last-updated').textContent = data.created;

        var scheduleUIs = card.querySelectorAll('.schedule');
        for(var i = 0; i<4; i++) {
            var schedule = schedules[i];
            var scheduleUI = scheduleUIs[i];
            if(schedule && scheduleUI) {
                scheduleUI.querySelector('.message').textContent = schedule.message;
            }
        }

        if (app.isLoading) {
            app.spinner.setAttribute('hidden', true);
            app.container.removeAttribute('hidden');
            app.isLoading = false;
        }
    };

    /*****************************************************************************
     *
     * Methods for dealing with the model
     *
     ****************************************************************************/


    app.getSchedule = function (key, label) {
        if(navigator.onLine){
            var url = 'https://api-ratp.pierre-grimaud.fr/v3/schedules/' + key;

            var request = new XMLHttpRequest();
            request.onreadystatechange = function () {
                if (request.readyState === XMLHttpRequest.DONE) {
                    if (request.status === 200) {
                        var response = JSON.parse(request.response);
                        var result = {};
                        result.key = key;
                        result.label = label;
                        result.created = response._metadata.date;
                        result.schedules = response.result.schedules;
                        app.updateTimetableCard(result);
                    }
                } else {
                    // Return the initial weather forecast since no data is available.
                    app.updateTimetableCard(initialStationTimetable);
                }
            };
            request.open('GET', url);
            request.send();
        }
        else{
            loadFromCache();
        }
    };

    app.saveSelectedTimetables = function() {
        var selectedTimetables = JSON.stringify(app.selectedTimetables);
        //localStorage.selectedTimetables = selectedTimetables;
        //pruebasAutomaticas.setItem("selectedTimetables", selectedTimetables);
        localforage.setItem('selectedTimetables', selectedTimetables).then(function(){
            return localforage.getItem('selectedTimetables');
        }).then(function(value){
            return value;
        }).catch(function(value){
            return value;
        });
      };

    // Iterate all of the cards and attempt to get the latest forecast data
    app.updateSchedules = function () {
        var keys = Object.keys(app.visibleCards);
        keys.forEach(function (key) {
            app.getSchedule(key);
        });
    };

    /*
     * Fake weather data that is presented when the user first uses the app,
     * or when the user has not saved any cities. See startup code for more
     * discussion.
     */

    var initialStationTimetable = {

        key: 'metros/1/bastille/A',
        label: 'Bastille, Direction La Défense',
        created: '2017-07-18T17:08:42+02:00',
        schedules: [
            {
                message: '0 mn'
            },
            {
                message: '2 mn'
            },
            {
                message: '5 mn'
            }
        ]


    };

    app.updateSchedules(initialStationTimetable);

    /************************************************************************
     *
     * Code required to start the app
     *
     * NOTE: To simplify this codelab, we've used localStorage.
     *   localStorage is a synchronous API and has serious performance
     *   implications. It should not be used in production applications!
     *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
     *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
     ************************************************************************/
    function loadFromCache(){
        localforage.getItem('selectedTimetables').then(function(value){
            app.selectedTimetables = JSON.parse(value);
            if(app.selectedTimetables !== null){
                app.selectedTimetables.forEach(function(city) {
                    app.getSchedule(city.key, city.label);
                }); 
            }
            else{
                app.getSchedule('metros/1/bastille/A', 'Bastille, Direction La Défense');
                    app.selectedTimetables = [
                        {key: initialStationTimetable.key, label: initialStationTimetable.label}
                    ];
            }
        })
    };
    loadFromCache();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
                 .register('./service-worker.js')
                 .then(function() { console.log('Service Worker Registered'); });
    }

    // if ('serviceWorker' in navigator) {
    //     // Delay registration until after the page has loaded, to ensure that our
    //     // precaching requests don't degrade the first visit experience.
    //     // See https://developers.google.com/web/fundamentals/instant-and-offline/service-worker/registration
    //     window.addEventListener('load', function() {
    //       // Your service-worker.js *must* be located at the top-level directory relative to your site.
    //       // It won't be able to control pages unless it's located at the same level or higher than them.
    //       // *Don't* register service worker file in, e.g., a scripts/ sub-directory!
    //       // See https://github.com/slightlyoff/ServiceWorker/issues/468
    //       navigator.serviceWorker.register('service-worker.js').then(function(reg) {
    //         // updatefound is fired if service-worker.js changes.
    //         reg.onupdatefound = function() {
    //           // The updatefound event implies that reg.installing is set; see
    //           // https://w3c.github.io/ServiceWorker/#service-worker-registration-updatefound-event
    //           var installingWorker = reg.installing;
      
    //           installingWorker.onstatechange = function() {
    //             switch (installingWorker.state) {
    //               case 'installed':
    //                 if (navigator.serviceWorker.controller) {
    //                   // At this point, the old content will have been purged and the fresh content will
    //                   // have been added to the cache.
    //                   // It's the perfect time to display a "New content is available; please refresh."
    //                   // message in the page's interface.
    //                   console.log('New or updated content is available.');
    //                 } else {
    //                   // At this point, everything has been precached.
    //                   // It's the perfect time to display a "Content is cached for offline use." message.
    //                   console.log('Content is now available offline!');
    //                 }
    //                 break;
      
    //               case 'redundant':
    //                 console.error('The installing service worker became redundant.');
    //                 break;
    //             }
    //           };
    //         };
    //       }).catch(function(e) {
    //         console.error('Error during service worker registration:', e);
    //       });
    //     });
    //   }

    // localforage.config({
    //     driver: localforage.INDEXEDDB,
    //     name: 'pruebaIdb',
    //     storeName: 'pruebasAutomaticas'
    // });
    
    localforage.config();

    //   var store = localforage.createInstance({
    //       name:"pruebas"
    //   });
})();
