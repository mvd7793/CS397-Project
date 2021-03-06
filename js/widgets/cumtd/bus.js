function Bus(site, id, db_data) {

    // This MUST be the first line in the constructor
    Widget.prototype.setupWidget.call(this, site, id, db_data, 1);

    // From this point, this.widget is set to a valid DOM element

    this.initBusResults();
    this.loadStops();

    if(db_data['selectedStopID'] !== undefined) {
        this.initialLoadStopsForID(db_data['selectedStopName'], db_data['selectedStopID']);
    }
}

Bus.prototype = Object.create(new Widget(), {
    testVar : { value: null}
});

Bus.prototype.initBusResults = function() {
    console.log(this.widget);
    $(this.widget).append('<div class="bus-results"><div class="select-container"><strong>Select a Stop: </strong><select></select></div><hr class="bus-top-line"></div>');

    setTimeout(this.setupSelectChangeListener.bind(this), 500);
};


Bus.prototype.setupSelectChangeListener = function() {
    $(this.widget).find('select').change(function(e) {
        this.initialLoadStopsForID($(e.srcElement).find('option:selected').html(), $(e.srcElement).val());
    }.bind(this));
};

/**
 * Sets up everything needed for the first load for an ID. This should be called in every scenario for which new results are loaded. (Basically the only time loadStopsForID should be used is when refreshed results are coming in.f)
 * @param  {string} id the ID of the bus stop
 */
Bus.prototype.initialLoadStopsForID = function(name, id) {
    this.clearResults();

    this.loadStopsForID(name, id);

    setTimeout(this.setClickListener.bind(this), 500);
    this.waitingTimesChecker = setInterval(this.updateWaitingTimes.bind(this), 5000);
    // setInterval(updateListing, 60 * 5 * 1000);
}

Bus.prototype.loadStopsForID = function(name, id) {
    this.mem['selectedStopID'] = id;
    this.mem['selectedStopName'] = name;
    this.updateWidgetIn(1000);
    this.addStop(this.mem['selectedStopName'], this.mem['selectedStopID']);
    $.getJSON('http://developer.cumtd.com/api/v2.1/json/GetDeparturesByStop?key=c519e892e46841b8957ef39461faa6fb&stop_id=' + id + '&callback=?', function(data) {

        data['departures'].forEach(function(departure) {
            this.addResult(departure);
        }.bind(this));

        this.setToCorrectSize();
    }.bind(this));
}

Bus.prototype.updateWaitingTimes = function() {
    $(this.widget).find('.bus-result').each(function (i) {
        var time = Date.parse($(this).find('.bus-expected').attr('time'));

        var diff = DateDiff.minutesUntil(time);

        if(diff < -1) {
            $(this).next().fadeOut().delay(400).remove();
            $(this).fadeOut().delay(400).remove();
        } else if (diff == -1) {
            diff = 0;
        }

        var expectedMin = $(this).find('.bus-route-expectedmin');

        // It's possible for the bus system to predict less minutes than the time would say. In that event, we're going to go with the bus system.
        if(parseInt($(expectedMin).text()) > diff) {
            $(this).find('.bus-route-expectedmin').text(diff + (diff == 1 ? " minute" : " minutes"));
        }
    });
}

Bus.prototype.setClickListener = function() {
    // console.log($('.bus-results .bus-result'));
    $(this.widget).find('.bus-results .bus-result').click(function() {
        // Draggable click event detection
        if($(this).closest('div.widget').hasClass('noclick')) {
            $(this).closest('div.widget').removeClass('noclick');
        } else {
            var pulldown = $(this).children('.bus-pulldown');
            if($(pulldown).is(':hidden')) {
                $(pulldown).slideDown();
            } else {
                $(pulldown).slideUp();
            }
        }
    });
}

Bus.prototype.addResult = function(departure) {
    $(this.widget).find('.bus-results').append('<div class="bus-result"><span class="bus-route-name">' + departure['headsign'] + '</span><span class="bus-route-expectedmin">' + departure['expected_mins'] + ' minutes</span><div class="bus-pulldown"><div class="bus-route-longname"><strong>Route: </strong><span class="bus-route-colored" style="color: #' + departure['route']['route_color'] +'">' + departure['route']['route_long_name'] + '</span></div><span class="bus-scheduled"><strong>Scheduled:</strong> ' + this.getFormattedTime(departure['scheduled']) + '</span><span class="bus-expected" time="' + departure['expected'] + '"><strong>Expected:</strong> ' + this.getFormattedTime(departure['expected']) + '</span></div></div><hr>');
}

Bus.prototype.cleanup = function() {
    clearTimeout(this.waitingTimesChecker);
};

/**
 * Deletes all bus results
 */
Bus.prototype.clearResults = function() {
    $(this.widget).find('.bus-results .bus-result, .bus-results hr:not([class="bus-top-line"])').remove();
}

/**
 * Returns an ISO time given by CumTD's API and returns it in an AM/PM time format
 */
Bus.prototype.getFormattedTime = function(time) {
    var date = Date.parse(time);
    return date.toString('h:mm tt');
}

Bus.prototype.loadStops = function() {
    $.getJSON('http://developer.cumtd.com/api/v2.1/json/GetStops?key=c519e892e46841b8957ef39461faa6fb&callback=?', function(data) {

        var stops = data['stops'];

        stops.forEach(function(stop) {
            this.addStop(stop['stop_name'], stop['stop_id']);
        }.bind(this));
    }.bind(this));
}

/**
 * Adds a stop to the selector if it's not there already
 * @param {string} name the name of the stop (shown in the select box)
 * @param {string} id   the id of the stop (cumtd API id)
 */
Bus.prototype.addStop = function(name, id) {
    var select = $(this.widget).find('select');
    if($(select).find("option[value='" + id + "']").length == 0) {
        $(select).append($('<option>', {value: id}).text(name));
    }
}
