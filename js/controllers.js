// Ionic Starter App
// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'

var app = angular.module('YourApp', ['ionic','ngAnimate', 'ngSanitize', 'ui.bootstrap', 'ui.rCalendar']);
// not necessary for a web based app // needed for cordova/ phonegap application
app.run(function ($ionicPlatform, $animate) {
        'use strict';
        $animate.enabled(false);
    })
//app run getting device id


/* Main Controller */
app.controller('CalendarCtrl', ['$scope', 'NewsApp', '$state', 'Config', '$ionicScrollDelegate', '$ionicPopup', '$location', function($scope, NewsApp, $state, Config,  $ionicScrollDelegate, $ionicPopup, $location) {
        'use strict';
        $scope.calendar = {};
        $scope.changeMode = function (mode) 
    {
        $scope.calendar.mode = mode;
        $(".cust_drop").toggleClass("bor_btm_clr");
        $("#menu_data").toggle();
    };

        $scope.loadEvents = function () {
            $scope.calendar.eventSource = createRandomEvents();
        };

        $scope.onEventSelected = function (event) {
            console.log('Event selected:' + event.startTime + '-' + event.endTime + ',' + event.title);
        };

        $scope.onViewTitleChanged = function (title,subtitle) 
    {
        $scope.viewTitle = title;
        if($scope.calendar.mode=="month" || $scope.calendar.mode=="day")
        {
            $scope.subTitle = subtitle;
        }
        else
        {
            $scope.subTitle="";
        }
    };
	$scope.displayMenus = function()
    {
        $(".cust_drop").toggleClass("bor_btm_clr");
        $("#menu_data").toggle();
        
    };
        $scope.today = function () {
            $scope.calendar.currentDate = new Date();
        };

        $scope.isToday = function () {
            var today = new Date(),
                currentCalendarDate = new Date($scope.calendar.currentDate);

            today.setHours(0, 0, 0, 0);
            currentCalendarDate.setHours(0, 0, 0, 0);
            return today.getTime() === currentCalendarDate.getTime();
        };

        $scope.onTimeSelected = function (selectedTime, events, disabled) {
            console.log('Selected time: ' + selectedTime + ', hasEvents: ' + (events !== undefined && events.length !== 0) + ', disabled: ' + disabled);
        };
        $scope.reloadSource = function (startTime, endTime,current_date) 
    {
        $scope.loading = true;
        var calendar_mode = $scope.calendar.mode;
        var teams=$scope.calendar.teamChanged;
        $scope.calendar.start_time=startTime;
        $scope.calendar.end_time=endTime;
        $scope.calendar.current_date=current_date;
        
        startTime = startTime.toString().replace("+", "%2B");
        endTime = endTime.toString().replace("+", "%2B");
        
        //console.log("curent_date"+current_date);
        NewsApp.get_events_data(calendar_mode, startTime, endTime, current_date,teams).success(function (data) {
        if (data.ret == '1')
        {
            //console.log(data.events);
            $scope.calendar.eventSource = data.events;
            $scope.loading = false;
            $ionicScrollDelegate.scrollTop(true);
        }
        }).error(function (data) {

        });
    };
    $scope.refreshEvents = function (mode,startTime, endTime,current_date) 
    {
        startTime = startTime.toString().replace("+", "%2B");
        endTime = endTime.toString().replace("+", "%2B");
        NewsApp.get_events_data(mode, startTime, endTime, current_date).success(function (data) {
        if (data.ret == '1')
        {
            //console.log(data.events);
            $scope.calendar.eventSource = data.events;
            $ionicScrollDelegate.scrollTop(true);
            
        }
        }).error(function (data) {

        });
    };

        function createRandomEvents() {
            var events = [];
            for (var i = 0; i < 50; i += 1) {
                var date = new Date();
                var eventType = Math.floor(Math.random() * 2);
                var startDay = Math.floor(Math.random() * 90) - 45;
                var endDay = Math.floor(Math.random() * 2) + startDay;
                var startTime;
                var endTime;
                if (eventType === 0) {
                    startTime = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + startDay));
                    if (endDay === startDay) {
                        endDay += 1;
                    }
                    endTime = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + endDay));
                    events.push({
                        title: 'All Day - ' + i,
                        startTime: startTime,
                        endTime: endTime,
                        allDay: true
                    });
                } else {
                    var startMinute = Math.floor(Math.random() * 24 * 60);
                    var endMinute = Math.floor(Math.random() * 180) + startMinute;
                    startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate() + startDay, 0, date.getMinutes() + startMinute);
                    endTime = new Date(date.getFullYear(), date.getMonth(), date.getDate() + endDay, 0, date.getMinutes() + endMinute);
                    events.push({
                        title: 'Event - ' + i,
                        startTime: startTime,
                        endTime: endTime,
                        allDay: false
                    });
                }
            }
			console.log(events);
            return events;
        }
    $scope.$on('$ionicView.beforeEnter', function () 
    {
		
        
     
    });
}]);














