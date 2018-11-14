angular.module("ui.rCalendar.tpls", ["templates/rcalendar/calendar.html","templates/rcalendar/day.html","templates/rcalendar/displayEvent.html","templates/rcalendar/month.html","templates/rcalendar/monthviewDisplayEvent.html","templates/rcalendar/monthviewEventDetail.html","templates/rcalendar/week.html"]);
angular.module('ui.rCalendar', ['ui.rCalendar.tpls'])
    .constant('calendarConfig', {
        formatDay: 'dd',
        formatDayHeader: 'EEE',
        formatDayTitle: 'EEEE',
        formatDaySubTitle: 'MMM dd',
        formatWeekTitle: 'MMM dd-',
        formatMonthTitle: 'MMM',
        formatWeekViewDayHeader: 'EEE d',
        formatHourColumn: 'ha',
        calendarMode: 'month',
        showEventDetail: true,
        startingDayMonth: 0,
        startingDayWeek: 0,
        allDayLabel: 'all day',
        noEventsLabel: '',
        eventSource: null,
        queryMode: 'remote',
        step: 60,
        autoSelect: false,
        monthviewDisplayEventTemplateUrl: 'templates/rcalendar/monthviewDisplayEvent.html',
        monthviewEventDetailTemplateUrl: 'templates/rcalendar/monthviewEventDetail.html',
        weekviewAllDayEventTemplateUrl: 'templates/rcalendar/displayEvent.html',
        weekviewNormalEventTemplateUrl: 'templates/rcalendar/displayEvent.html',
        dayviewAllDayEventTemplateUrl: 'templates/rcalendar/displayEvent.html',
        dayviewNormalEventTemplateUrl: 'templates/rcalendar/displayEvent.html'
    })
    .controller('ui.rCalendar.CalendarController', ['$scope', 'NewsApp', '$attrs', '$parse', '$interpolate', '$log', 'dateFilter', 'calendarConfig', '$timeout', '$ionicSlideBoxDelegate', function ($scope, NewsApp, $attrs, $parse, $interpolate, $log, dateFilter, calendarConfig, $timeout, $ionicSlideBoxDelegate) {
        'use strict';
        var self = this,
            ngModelCtrl = {$setViewValue: angular.noop}; // nullModelCtrl;

        // Configuration attributes
        angular.forEach(['formatDay', 'formatDayHeader', 'formatDayTitle', 'formatWeekTitle', 'formatMonthTitle', 'formatWeekViewDayHeader', 'formatHourColumn',
            'allDayLabel', 'noEventsLabel'], function (key, index) {
            self[key] = angular.isDefined($attrs[key]) ? $interpolate($attrs[key])($scope.$parent) : calendarConfig[key];
        });

        angular.forEach(['showEventDetail', 'monthviewDisplayEventTemplateUrl', 'monthviewEventDetailTemplateUrl', 'weekviewAllDayEventTemplateUrl', 'weekviewNormalEventTemplateUrl', 'dayviewAllDayEventTemplateUrl', 'dayviewNormalEventTemplateUrl', 'eventSource', 'queryMode', 'step', 'startingDayMonth', 'startingDayWeek', 'autoSelect'], function (key, index) {
            self[key] = angular.isDefined($attrs[key]) ? ($scope.$parent.$eval($attrs[key])) : calendarConfig[key];
        });

        self.hourParts = 1;
        if (self.step === 60 || self.step === 30 || self.step === 15) {
            self.hourParts = Math.floor(60 / self.step);
        } else {
            throw new Error('Invalid step parameter: ' + self.step);
        }

        var unregisterFn = $scope.$parent.$watch($attrs.eventSource, function (value) {
            self.onEventSourceChanged(value);
            console.log(value);
        });
        $scope.$on('$destroy', unregisterFn);
        $scope.show_more = function (index) 
        {
            $("#show_less_"+index).addClass("notdisplay");
            $("#show_more_"+index).removeClass("notdisplay");
        }
        
        
        $scope.calendarMode = $scope.calendarMode || calendarConfig.calendarMode;
        if (angular.isDefined($attrs.initDate)) {
            self.currentCalendarDate = $scope.$parent.$eval($attrs.initDate);
        }
        if (!self.currentCalendarDate) {
            self.currentCalendarDate = new Date();
            if ($attrs.ngModel && !$scope.$parent.$eval($attrs.ngModel)) {
                $parse($attrs.ngModel).assign($scope.$parent, self.currentCalendarDate);
            }
        }

        function overlap(event1, event2) {
            var earlyEvent = event1,
                lateEvent = event2;
            if (event1.startIndex > event2.startIndex || (event1.startIndex === event2.startIndex && event1.startOffset > event2.startOffset)) {
                earlyEvent = event2;
                lateEvent = event1;
            }

            if (earlyEvent.endIndex <= lateEvent.startIndex) {
                return false;
            } else {
                return !(earlyEvent.endIndex - lateEvent.startIndex === 1 && earlyEvent.endOffset + lateEvent.startOffset >= self.hourParts);
            }
        }

        function calculatePosition(events) {
            var i,
                j,
                len = events.length,
                maxColumn = 0,
                col,
                isForbidden = new Array(len);

            for (i = 0; i < len; i += 1) {
                for (col = 0; col < maxColumn; col += 1) {
                    isForbidden[col] = false;
                }
                for (j = 0; j < i; j += 1) {
                    if (overlap(events[i], events[j])) {
                        isForbidden[events[j].position] = true;
                    }
                }
                for (col = 0; col < maxColumn; col += 1) {
                    if (!isForbidden[col]) {
                        break;
                    }
                }
                if (col < maxColumn) {
                    events[i].position = col;
                } else {
                    events[i].position = maxColumn++;
                }
            }
        }

        function calculateWidth(orderedEvents, hourParts) {
            var totalSize = 24 * hourParts,
                cells = new Array(totalSize),
                event,
                index,
                i,
                j,
                len,
                eventCountInCell,
                currentEventInCell;

            //sort by position in descending order, the right most columns should be calculated first
            orderedEvents.sort(function (eventA, eventB) {
                return eventB.position - eventA.position;
            });
            for (i = 0; i < totalSize; i += 1) {
                cells[i] = {
                    calculated: false,
                    events: []
                };
            }
            len = orderedEvents.length;
            for (i = 0; i < len; i += 1) {
                event = orderedEvents[i];
                index = event.startIndex * hourParts + event.startOffset;
                while (index < event.endIndex * hourParts - event.endOffset) {
                    cells[index].events.push(event);
                    index += 1;
                }
            }

            i = 0;
            while (i < len) {
                event = orderedEvents[i];
                if (!event.overlapNumber) {
                    var overlapNumber = event.position + 1;
                    event.overlapNumber = overlapNumber;
                    var eventQueue = [event];
                    while ((event = eventQueue.shift())) {
                        index = event.startIndex * hourParts + event.startOffset;
                        while (index < event.endIndex * hourParts - event.endOffset) {
                            if (!cells[index].calculated) {
                                cells[index].calculated = true;
                                if (cells[index].events) {
                                    eventCountInCell = cells[index].events.length;
                                    for (j = 0; j < eventCountInCell; j += 1) {
                                        currentEventInCell = cells[index].events[j];
                                        if (!currentEventInCell.overlapNumber) {
                                            currentEventInCell.overlapNumber = overlapNumber;
                                            eventQueue.push(currentEventInCell);
                                        }
                                    }
                                }
                            }
                            index += 1;
                        }
                    }
                }
                i += 1;
            }
        }

        function getAdjacentCalendarDate(currentCalendarDate, direction) {
            var step = self.mode.step,
                calculateCalendarDate = new Date(currentCalendarDate),
                year = calculateCalendarDate.getFullYear() + direction * (step.years || 0),
                month = calculateCalendarDate.getMonth() + direction * (step.months || 0),
                date = calculateCalendarDate.getDate() + direction * (step.days || 0),
                firstDayInNextMonth;

            calculateCalendarDate.setFullYear(year, month, date);
            if ($scope.calendarMode === 'month') {
                firstDayInNextMonth = new Date(year, month + 1, 1);
                if (firstDayInNextMonth.getTime() <= calculateCalendarDate.getTime()) {
                    calculateCalendarDate = new Date(firstDayInNextMonth - 24 * 60 * 60 * 1000);
                }
            }
            return calculateCalendarDate;
        }

        self.init = function (ngModelCtrl_) {
            ngModelCtrl = ngModelCtrl_;

            ngModelCtrl.$render = function () {
                self.render();
            };
        };

        self.render = function () {
            if (ngModelCtrl.$modelValue) {
                var date = new Date(ngModelCtrl.$modelValue),
                    isValid = !isNaN(date);

                if (isValid) {
                    this.currentCalendarDate = date;
                } else {
                    $log.error('"ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.');
                }
                ngModelCtrl.$setValidity('date', isValid);
            }
            this.refreshView();
        };

        self.refreshView = function () {
            $(".dayview-allday-table_1").hide();
            if (this.mode) {
                this.range = this._getRange(this.currentCalendarDate);
                if ($scope.titleChanged) {
                    $scope.titleChanged({title: self._getTitle(),subtitle:self._subTitle()});
                    
                }
                this._refreshView();
                this.rangeChanged();
                 
            }
        };

        // Split array into smaller arrays
        self.split = function (arr, size) {
            var arrays = [];
            while (arr.length > 0) {
                arrays.push(arr.splice(0, size));
            }
            return arrays;
        };

        self.onEventSourceChanged = function (value) {
            self.eventSource = value;
            if (self._onDataLoaded) {
                self._onDataLoaded();
               
            }
           
        };

        self.getAdjacentViewStartTime = function (direction) {
            var adjacentCalendarDate = getAdjacentCalendarDate(self.currentCalendarDate, direction);
            return self._getRange(adjacentCalendarDate).startTime;
        };

        self.move = function (direction) {
            self.direction = direction;
            if (!self.moveOnSelected) {
                self.currentCalendarDate = getAdjacentCalendarDate(self.currentCalendarDate, direction);
            }
            ngModelCtrl.$setViewValue(self.currentCalendarDate);
            self.refreshView();
            self.direction = 0;
            self.moveOnSelected = false;
           
        };

        self.rangeChanged = function () {
            if (self.queryMode === 'local') {
                if (self.eventSource && self._onDataLoaded) {
                    self._onDataLoaded();
                }
            } else if (self.queryMode === 'remote') {
                if ($scope.rangeChanged) {
                    $scope.rangeChanged({
                        startTime: this.range.startTime,
                        endTime: this.range.endTime,
                        Current_date:self.currentCalendarDate
                    });
                }
            }
        };

        self.registerSlideChanged = function (scope) {    
            scope.currentViewIndex = 0;
            scope.slideChanged = function ($index) {
                $timeout(function () {
                    var currentViewIndex = scope.currentViewIndex,
                        direction = 0;
                    if ($index - currentViewIndex === 1 || ($index === 0 && currentViewIndex === 2)) {
                        direction = 1;
                    } else if (currentViewIndex - $index === 1 || ($index === 2 && currentViewIndex === 0)) {
                        direction = -1;
                    }
                    currentViewIndex = $index;
                    scope.currentViewIndex = currentViewIndex;
                    self.move(direction);
                    scope.$digest();
                    
                }, 100);
                $timeout(function () {
                  $(".dayview-allday-table_1").show();     
                }, 600);
            };
            
             
        };
       
       
        self.populateAdjacentViews = function (scope) {
            var currentViewStartDate,
                currentViewData,
                toUpdateViewIndex,
                currentViewIndex = scope.currentViewIndex,
                getViewData = this._getViewData;

            if (self.direction === 1) {
                currentViewStartDate = self.getAdjacentViewStartTime(1);
                toUpdateViewIndex = (currentViewIndex + 1) % 3;
                angular.copy(getViewData(currentViewStartDate), scope.views[toUpdateViewIndex]);
            } else if (self.direction === -1) {
                currentViewStartDate = self.getAdjacentViewStartTime(-1);
                toUpdateViewIndex = (currentViewIndex + 2) % 3;
                angular.copy(getViewData(currentViewStartDate), scope.views[toUpdateViewIndex]);
            } else {
                if (!scope.views) {
                    currentViewData = [];
                    currentViewStartDate = self.range.startTime;
                    currentViewData.push(getViewData(currentViewStartDate));
                    currentViewStartDate = self.getAdjacentViewStartTime(1);
                    currentViewData.push(getViewData(currentViewStartDate));
                    currentViewStartDate = self.getAdjacentViewStartTime(-1);
                    currentViewData.push(getViewData(currentViewStartDate));
                    scope.views = currentViewData;
                } else {
                    currentViewStartDate = self.range.startTime;
                    angular.copy(getViewData(currentViewStartDate), scope.views[currentViewIndex]);
                    currentViewStartDate = self.getAdjacentViewStartTime(-1);
                    toUpdateViewIndex = (currentViewIndex + 2) % 3;
                    angular.copy(getViewData(currentViewStartDate), scope.views[toUpdateViewIndex]);
                    currentViewStartDate = self.getAdjacentViewStartTime(1);
                    toUpdateViewIndex = (currentViewIndex + 1) % 3;
                    angular.copy(getViewData(currentViewStartDate), scope.views[toUpdateViewIndex]);
                }
            }
        };

        self.placeEvents = function (orderedEvents) {
            calculatePosition(orderedEvents);
            calculateWidth(orderedEvents, self.hourParts);
        };

        self.placeAllDayEvents = function (orderedEvents) {
            calculatePosition(orderedEvents);
        };

        self.slideView = function (direction) {
            var slideHandle = $ionicSlideBoxDelegate.$getByHandle($scope.calendarMode + 'view-slide');
             $scope.slide=true;
            if (slideHandle) {
                if (direction === 1) {
                    slideHandle.next();
                } else if (direction === -1) {
                    slideHandle.previous();
                }
                
            }
           
            
            
        };
       
    }])
    .directive('calendar', function () {
        'use strict';
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'templates/rcalendar/calendar.html',
            scope: {
                calendarMode: '=',
                rangeChanged: '&',
                eventSelected: '&',
                timeSelected: '&',
                titleChanged: '&',
                isDateDisabled: '&'
            },
            require: ['calendar', '?^ngModel'],
            controller: 'ui.rCalendar.CalendarController',
            link: function (scope, element, attrs, ctrls) {
                var calendarCtrl = ctrls[0], ngModelCtrl = ctrls[1];

                if (ngModelCtrl) {
                    calendarCtrl.init(ngModelCtrl);
                }

                scope.$on('changeDate', function (event, direction) {
                    calendarCtrl.slideView(direction);
                });

                scope.$on('eventSourceChanged', function (event, value) {
                    calendarCtrl.onEventSourceChanged(value);
                    
                });
            }
        };
    })
    .directive('monthview', ['dateFilter', function (dateFilter) {
        'use strict';
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'templates/rcalendar/month.html',
            require: ['^calendar', '?^ngModel'],
            link: function (scope, element, attrs, ctrls) {
                var ctrl = ctrls[0],
                    ngModelCtrl = ctrls[1];
                scope.showEventDetail = ctrl.showEventDetail;
                scope.formatDayHeader = ctrl.formatDayHeader;
                scope.autoSelect = ctrl.autoSelect;
                ctrl.mode = {
                    step: {months: 1}
                };
               

                scope.noEventsLabel = ctrl.noEventsLabel;
                scope.displayEventTemplateUrl = ctrl.monthviewDisplayEventTemplateUrl;
                scope.eventDetailTemplateUrl = ctrl.monthviewEventDetailTemplateUrl;
                scope.labels=["S", "M", "T", "W","T","F","S"];
                function getDates(startDate, n) {
                    var dates = new Array(n), current = new Date(startDate), i = 0;
                    current.setHours(12); // Prevent repeated dates because of timezone bug
                    while (i < n) {
                        dates[i++] = new Date(current);
                        current.setDate(current.getDate() + 1);
                    }
                    return dates;
                }

                function createDateObject(date, format) {
                    var dateObject = {
                        date: date,
                        label: dateFilter(date, format)
                    };

                    if (scope.isDateDisabled) {
                        dateObject.disabled = scope.isDateDisabled({date: date});
                    }

                    return dateObject;
                }

                function updateCurrentView(currentViewStartDate, view) {
                    var currentCalendarDate = ctrl.currentCalendarDate,
                        today = new Date(),
                        oneDay = 86400000,
                        r,
                        selectedDayDifference = Math.floor((currentCalendarDate.getTime() - currentViewStartDate.getTime()) / oneDay),
                        currentDayDifference = Math.floor((today.getTime() - currentViewStartDate.getTime()) / oneDay);

                    for (r = 0; r < 42; r += 1) {
                        view.dates[r].selected = false;
                    }

                    if (selectedDayDifference >= 0 && selectedDayDifference < 42 && (scope.autoSelect )) {
                        view.dates[selectedDayDifference].selected = true;
                        scope.selectedDate = view.dates[selectedDayDifference];
                    } else {
                        scope.selectedDate = {
                            events: []
                        };
                    }

                    if (currentDayDifference >= 0 && currentDayDifference < 42) {
                        view.dates[currentDayDifference].current = true;
                    }
                }

                function compareEvent(event1, event2) {
                    if (event1.allDay) {
                        return 1;
                    } else if (event2.allDay) {
                        return -1;
                    } else {
                        return (event1.startTime.getTime() - event2.startTime.getTime());
                    }
                }

                scope.select = function (viewDate) {
                    var selectedDate = viewDate.date,
                        events = viewDate.events,
                        views = scope.views,
                        dates,
                        r;
                    if (views) {
                        dates = views[scope.currentViewIndex].dates;
                        var currentCalendarDate = ctrl.currentCalendarDate;
                        var currentMonth = currentCalendarDate.getMonth();
                        var currentYear = currentCalendarDate.getFullYear();
                        var selectedMonth = selectedDate.getMonth();
                        var selectedYear = selectedDate.getFullYear();
                        var direction = 0;
                        if (currentYear === selectedYear) {
                            if (currentMonth !== selectedMonth) {
                                direction = currentMonth < selectedMonth ? 1 : -1;
                            }
                        } else {
                            direction = currentYear < selectedYear ? 1 : -1;
                        }

                        ctrl.currentCalendarDate = selectedDate;
                        if (direction === 0) {
                            if (ngModelCtrl) {
                                ngModelCtrl.$setViewValue(selectedDate);
                            }
                            var currentViewStartDate = ctrl.range.startTime,
                                oneDay = 86400000,
                                selectedDayDifference = Math.floor((selectedDate.getTime() - currentViewStartDate.getTime()) / oneDay);
                            for (r = 0; r < 42; r += 1) {
                                dates[r].selected = false;
                            }

                            if (selectedDayDifference >= 0 && selectedDayDifference < 42) {
                                dates[selectedDayDifference].selected = true;
                                scope.selectedDate = dates[selectedDayDifference];
                            }
                        } else {
                            ctrl.moveOnSelected = true;
                            ctrl.slideView(direction);
                            
                        }

                        if (scope.timeSelected) {
                            scope.timeSelected({
                                selectedTime: selectedDate,
                                events: events,
                                disabled: viewDate.disabled || false
                            });
                        }
                        scope.evt_detail_title=selectedDate.toLocaleString("en-us", { weekday: "long" }).toUpperCase()+","+selectedDate.toLocaleString("en-us", { month: "short" }).toUpperCase()+" "+("0" + selectedDate.getDate()).slice(-2);
                        //scope.evt_detail_title=localStorage.event_Date;
                    }
                };
                
                scope.getHighlightClass = function (date) {
                    var className = '';

                    if (date.hasEvent) {
                        if (date.secondary) {
                            className = 'monthview-secondary-with-event';
                        } else {
                            className = 'monthview-primary-with-event';
                        }
                    }

                    if (date.selected) {
                        if (className) {
                            className += ' ';
                        }
                        className += 'monthview-selected';
                    }

                    if (date.current) {
                        if (className) {
                            className += ' ';
                        }
                        className += 'monthview-current';
                    }

                    if (date.secondary) {
                        if (className) {
                            className += ' ';
                        }
                        className += 'text-muted';
                    }

                    if (date.disabled) {
                        if (className) {
                            className += ' ';
                        }
                        className += 'monthview-disabled';
                    }
                    return className;
                };

                ctrl._getTitle = function () {
                    var currentViewStartDate = ctrl.range.startTime,
                        date = currentViewStartDate.getDate(),
                        month = (currentViewStartDate.getMonth() + (date !== 1 ? 1 : 0)) % 12,
                        year = currentViewStartDate.getFullYear() + (date !== 1 && month === 0 ? 1 : 0),
                        headerDate = new Date(year, month, 1);
                    return dateFilter(headerDate, ctrl.formatMonthTitle).toUpperCase();
                };
                ctrl._subTitle = function () {
                    var currentViewStartDate = ctrl.range.startTime,
                        date = currentViewStartDate.getDate(),
                        month = (currentViewStartDate.getMonth() + (date !== 1 ? 1 : 0)) % 12,
                        year = currentViewStartDate.getFullYear() + (date !== 1 && month === 0 ? 1 : 0),
                        headerDate = new Date(year, month, 1);
                    return  headerDate.getFullYear();
                };

                ctrl._getViewData = function (startTime) {
                    var startDate = startTime,
                        date = startDate.getDate(),
                        month = (startDate.getMonth() + (date !== 1 ? 1 : 0)) % 12;

                    var days = getDates(startDate, 42);
                    for (var i = 0; i < 42; i++) {
                        days[i] = angular.extend(createDateObject(days[i], ctrl.formatDay), {
                            secondary: days[i].getMonth() !== month
                        });
                    }
                     
                    return {
                        dates: days
                    };
                   
                };

                ctrl._refreshView = function () {
                    ctrl.populateAdjacentViews(scope);
                    
                    updateCurrentView(ctrl.range.startTime, scope.views[scope.currentViewIndex]);
                    scope.evt_detail_title="";
                    //var selectedDate=ctrl.currentCalendarDate;
                    //scope.evt_detail_title=selectedDate.toLocaleString("en-us", { weekday: "long" }).toUpperCase()+","+selectedDate.toLocaleString("en-us", { month: "short" }).toUpperCase()+" "+("0" + selectedDate.getDate()).slice(-2);
                };

                ctrl._onDataLoaded = function () {
                   
                    var eventSource = ctrl.eventSource,
                        len = eventSource ? eventSource.length : 0,
                        startTime = ctrl.range.startTime,
                        endTime = ctrl.range.endTime,
                        utcStartTime = new Date(Date.UTC(startTime.getFullYear(), startTime.getMonth(), startTime.getDate())),
                        utcEndTime = new Date(Date.UTC(endTime.getFullYear(), endTime.getMonth(), endTime.getDate())),
                        currentViewIndex = scope.currentViewIndex,
                        dates = scope.views[currentViewIndex].dates,
                        oneDay = 86400000,
                        eps = 0.001;
                
                    for (var r = 0; r < 42; r += 1) {
                        if (dates[r].hasEvent) {
                            dates[r].hasEvent = false;
                            dates[r].events = [];
                        }
                    }

                    for (var i = 0; i < len; i += 1) {
                        var event = eventSource[i];
                        var eventStartTime = new Date(event.startTime);
                        var eventEndTime = new Date(event.endTime);
                        var st;
                        var et;

                        if (event.allDay) {
                            if (eventEndTime <= utcStartTime || eventStartTime >= utcEndTime) {
                                continue;
                            } else {
                                st = utcStartTime;
                                et = utcEndTime;
                            }
                        } else {
                            if (eventEndTime <= startTime || eventStartTime >= endTime) {
                                continue;
                            } else {
                                st = startTime;
                                et = endTime;
                            }
                        }

                        var timeDiff;
                        var timeDifferenceStart;
                        if (eventStartTime <= st) {
                            timeDifferenceStart = 0;
                        } else {
                            timeDiff = eventStartTime - st;
                            if (!event.allDay) {
                                timeDiff = timeDiff - (eventStartTime.getTimezoneOffset() - st.getTimezoneOffset()) * 60000;
                            }
                            timeDifferenceStart = timeDiff / oneDay;
                        }

                        var timeDifferenceEnd;
                        if (eventEndTime >= et) {
                            timeDiff = et - st;
                            if (!event.allDay) {
                                timeDiff = timeDiff - (et.getTimezoneOffset() - st.getTimezoneOffset()) * 60000;
                            }
                            timeDifferenceEnd = timeDiff / oneDay;
                        } else {
                            timeDiff = eventEndTime - st;
                            if (!event.allDay) {
                                timeDiff = timeDiff - (eventEndTime.getTimezoneOffset() - st.getTimezoneOffset()) * 60000;
                            }
                            timeDifferenceEnd = timeDiff / oneDay;
                        }

                        var index = Math.floor(timeDifferenceStart);
                        var eventSet;
                        while (index < timeDifferenceEnd - eps) {
                            dates[index].hasEvent = true;
                            eventSet = dates[index].events;
                            if (eventSet) {
                                eventSet.push(event);
                            } else {
                                eventSet = [];
                                eventSet.push(event);
                                dates[index].events = eventSet;
                            }
                            index += 1;
                        }
                    }

                    for (r = 0; r < 42; r += 1) {
                        if (dates[r].hasEvent) {
                           // dates[r].events.sort(compareEvent);
                        }
                    }

                    if (scope.autoSelect) {
                        var findSelected = false;
                        for (r = 0; r < 42; r += 1) {
                            if (dates[r].selected) {
                                scope.selectedDate = dates[r];
                                findSelected = true;
                                break;
                            }
                            if (findSelected) {
                                break;
                            }
                        }
                        
                    }
                
                };

                ctrl._getRange = function getRange(currentDate) {
                    var year = currentDate.getFullYear(),
                        month = currentDate.getMonth(),
                        firstDayOfMonth = new Date(year, month, 1),
                        difference = ctrl.startingDayMonth - firstDayOfMonth.getDay(),
                        numDisplayedFromPreviousMonth = (difference > 0) ? 7 - difference : -difference,
                        startDate = new Date(firstDayOfMonth),
                        endDate;

                    if (numDisplayedFromPreviousMonth > 0) {
                        startDate.setDate(-numDisplayedFromPreviousMonth + 1);
                    }

                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 42);

                    return {
                        startTime: startDate,
                        endTime: endDate
                    };
                };

                ctrl.registerSlideChanged(scope);

                ctrl.refreshView();
            }
        };
    }])
    .directive('weekview', ['dateFilter', 'NewsApp', function (dateFilter,NewsApp) {
        'use strict';
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'templates/rcalendar/week.html',
            require: '^calendar',
            link: function (scope, element, attrs, ctrl) {
                scope.formatWeekViewDayHeader = ctrl.formatWeekViewDayHeader;
                scope.formatHourColumn = ctrl.formatHourColumn;

                ctrl.mode = {
                    step: {days: 7}
                };

                scope.allDayLabel = ctrl.allDayLabel;
                scope.hourParts = ctrl.hourParts;
                scope.allDayEventTemplateUrl = ctrl.weekviewAllDayEventTemplateUrl;
                scope.normalEventTemplateUrl = ctrl.weekviewNormalEventTemplateUrl;

                function getDates(startTime, n) {
                    var dates = new Array(n),
                        current = new Date(startTime),
                        i = 0;
                    current.setHours(12); // Prevent repeated dates because of timezone bug
                    while (i < n) {
                        dates[i++] = {
                            date: new Date(current)
                        };
                        current.setDate(current.getDate() + 1);
                    }
                    return dates;
                }

                function createDateObjects(startTime) {
                    var times = [],
                        row,
                        time,
                        currentHour = startTime.getHours(),
                        currentDate = startTime.getDate();

                    for (var hour = 0; hour < 24; hour += 1) {
                        row = [];
                        for (var day = 0; day < 7; day += 1) {
                            time = new Date(startTime.getTime());
                            time.setHours(currentHour + hour);
                            time.setDate(currentDate + day);
                            row.push({
                                time: time
                            });
                        }
                        times.push(row);
                    }
                    return times;
                }

                function compareEventByStartOffset(eventA, eventB) {
                    return eventA.startOffset - eventB.startOffset;
                }

                //This can be decomissioned when upgrade to Angular 1.3
                function getISO8601WeekNumber(date) {
                    var dayOfWeekOnFirst = (new Date(date.getFullYear(), 0, 1)).getDay();
                    var firstThurs = new Date(date.getFullYear(), 0, ((dayOfWeekOnFirst <= 4) ? 5 : 12) - dayOfWeekOnFirst);
                    var thisThurs = new Date(date.getFullYear(), date.getMonth(), date.getDate() + (4 - date.getDay()));
                    var diff = thisThurs - firstThurs;
                    return (1 + Math.round(diff / 6.048e8)); // 6.048e8 ms per week
                }
                
                 
                ctrl._getTitle = function () {
                    var firstDayOfWeek = ctrl.range.startTime,
                        weekNumberIndex,
                        weekFormatPattern = 'w',
                        title;
                 var week_end_date = ctrl.range.endTime.getDate()-1;
                    weekNumberIndex = ctrl.formatWeekTitle.indexOf(weekFormatPattern);
                    title = dateFilter(firstDayOfWeek, ctrl.formatWeekTitle);
                    if (weekNumberIndex !== -1) {
                        title = title.replace(weekFormatPattern, getISO8601WeekNumber(firstDayOfWeek));
                    }
                    title = title+("0" + week_end_date).slice(-2);
                    title = title.toUpperCase();
                    return title;
                };

                scope.select = function (selectedTime, events) {
                    if (scope.timeSelected) {
                        var disabled;
                        if (scope.isDateDisabled) {
                            disabled = scope.isDateDisabled({date: selectedTime});
                        }
                        scope.timeSelected({selectedTime: selectedTime, events: events, disabled: disabled || false});
                    }
                };

                ctrl._getViewData = function (startTime) {
                    return {
                        rows: createDateObjects(startTime),
                        dates: getDates(startTime, 7)
                    };
                };

                ctrl._refreshView = function () {
                    scope.week_end_date=ctrl.range.endTime;
                    //console.log("week_end_date"+scope.week_end_date);
                    ctrl.populateAdjacentViews(scope);
                };
                
                ctrl._onDataLoaded = function () {
                   
                    var eventSource = ctrl.eventSource,
                        i,
                        day,
                        hour,
                        len = eventSource ? eventSource.length : 0,
                        startTime = ctrl.range.startTime,
                        endTime = ctrl.range.endTime,
                        utcStartTime = new Date(Date.UTC(startTime.getFullYear(), startTime.getMonth(), startTime.getDate())),
                        utcEndTime = new Date(Date.UTC(endTime.getFullYear(), endTime.getMonth(), endTime.getDate())),
                        currentViewIndex = scope.currentViewIndex,
                        rows = scope.views[currentViewIndex].rows,
                        dates = scope.views[currentViewIndex].dates,
                        oneHour = 3600000,
                        oneDay = 86400000,
                        //add allday eps
                        eps = 0.016,
                        eventSet,
                        allDayEventInRange = false,
                        normalEventInRange = false;
                        scope.week_event=eventSource;
                        scope.week_end_date=ctrl.range.endTime;
                       //console.log("dataload"+scope.week_end_date);
                    for (i = 0; i < 7; i += 1) {
                        dates[i].events = [];
                    }

                    for (day = 0; day < 7; day += 1) {
                        for (hour = 0; hour < 24; hour += 1) {
                            rows[hour][day].events = [];
                        }
                    }
                    for (i = 0; i < len; i += 1) {
                        var event = eventSource[i];
                        var eventStartTime = new Date(event.startTime);
                        var eventEndTime = new Date(event.endTime);

                        if (event.allDay) {
                            if (eventEndTime <= utcStartTime || eventStartTime >= utcEndTime) {
                                continue;
                            } else {
                                allDayEventInRange = true;

                                var allDayStartIndex;
                                if (eventStartTime <= utcStartTime) {
                                    allDayStartIndex = 0;
                                } else {
                                    allDayStartIndex = Math.floor((eventStartTime - utcStartTime) / oneDay);
                                }

                                var allDayEndIndex;
                                if (eventEndTime >= utcEndTime) {
                                    allDayEndIndex = Math.ceil((utcEndTime - utcStartTime) / oneDay);
                                } else {
                                    allDayEndIndex = Math.ceil((eventEndTime - utcStartTime) / oneDay);
                                }

                                var displayAllDayEvent = {
                                    event: event,
                                    startIndex: allDayStartIndex,
                                    endIndex: allDayEndIndex
                                };

                                eventSet = dates[allDayStartIndex].events;
                                if (eventSet) {
                                    eventSet.push(displayAllDayEvent);
                                } else {
                                    eventSet = [];
                                    eventSet.push(displayAllDayEvent);
                                    dates[allDayStartIndex].events = eventSet;
                                }
                            }
                        } else {
                            if (eventEndTime <= startTime || eventStartTime >= endTime) {
                                continue;
                            } else {
                                normalEventInRange = true;

                                var timeDiff;
                                var timeDifferenceStart;
                                if (eventStartTime <= startTime) {
                                    timeDifferenceStart = 0;
                                } else {
                                    timeDiff = eventStartTime - startTime - (eventStartTime.getTimezoneOffset() - startTime.getTimezoneOffset()) * 60000;
                                    timeDifferenceStart = timeDiff / oneHour;
                                }

                                var timeDifferenceEnd;
                                if (eventEndTime >= endTime) {
                                    timeDiff = endTime - startTime - (endTime.getTimezoneOffset() - startTime.getTimezoneOffset()) * 60000;
                                    timeDifferenceEnd = timeDiff / oneHour;
                                } else {
                                    timeDiff = eventEndTime - startTime - (eventEndTime.getTimezoneOffset() - startTime.getTimezoneOffset()) * 60000;
                                    timeDifferenceEnd = timeDiff / oneHour;
                                }

                                var startIndex = Math.floor(timeDifferenceStart);
                                var endIndex = Math.ceil(timeDifferenceEnd - eps);
                                var startRowIndex = startIndex % 24;
                                var dayIndex = Math.floor(startIndex / 24);
                                var endOfDay = dayIndex * 24;
                                var endRowIndex;
                                var startOffset = 0;
                                var endOffset = 0;
                                if (ctrl.hourParts !== 1) {
                                    startOffset = Math.floor((timeDifferenceStart - startIndex) * ctrl.hourParts);
                                }

                                do {
                                    endOfDay += 24;
                                    if (endOfDay <= endIndex) {
                                        endRowIndex = 24;
                                    } else {
                                        endRowIndex = endIndex % 24;
                                        if (ctrl.hourParts !== 1) {
                                            endOffset = Math.floor((endIndex - timeDifferenceEnd) * ctrl.hourParts);
                                        }
                                    }
                                   /*var displayEvent = {
                                        event: event,
                                        startIndex: startRowIndex,
                                        endIndex: endRowIndex,
                                        startOffset: startOffset,
                                        endOffset: endOffset
                                    };
                                    eventSet = rows[startRowIndex][dayIndex].events;
                                    if (eventSet) {
                                        eventSet.push(displayEvent);
                                    } else {
                                        eventSet = [];
                                        eventSet.push(displayEvent);
                                        rows[startRowIndex][dayIndex].events = eventSet;
                                    }
                                    startRowIndex = 0;
                                    startOffset = 0;
                                    dayIndex += 1;*/
                                } while (endOfDay < endIndex);
                            }
                        }
                    }

                    if (normalEventInRange) {
                        for (day = 0; day < 7; day += 1) {
                            var orderedEvents = [];
                            for (hour = 0; hour < 24; hour += 1) {
                                if (rows[hour][day].events) {
                                    rows[hour][day].events.sort(compareEventByStartOffset);

                                    orderedEvents = orderedEvents.concat(rows[hour][day].events);
                                }
                            }
                            if (orderedEvents.length > 0) {
                                ctrl.placeEvents(orderedEvents);
                            }
                        }
                    }

                    if (allDayEventInRange) {
                        var orderedAllDayEvents = [];
                        for (day = 0; day < 7; day += 1) {
                            if (dates[day].events) {
                                orderedAllDayEvents = orderedAllDayEvents.concat(dates[day].events);
                            }
                        }
                        if (orderedAllDayEvents.length > 0) {
                            ctrl.placeAllDayEvents(orderedAllDayEvents);
                        }
                    }
                     scope.loading = false;
                };
                scope.loadData = function(date) 
                {
                    scope.loading = true;
                    scope.srch_teams=localStorage.calendar_teams;
                    if (typeof scope.srch_teams == 'undefined')
                    {
                        scope.srch_teams = "all";
                    }
                    NewsApp.get_load_events_data(date,scope.srch_teams).success(function (data) {
                    if (data.ret == '1')
                    {
                        var previous_events = scope.week_event;
                        var append_events = data.events;
                        var week_events = previous_events.concat(append_events);
                        scope.week_event= week_events;
                        scope.week_end_date= new Date(data.week_end_date);
                        //console.log("week_enDs"+scope.week_end_date);
                        scope.loading = false;
                        scope.$broadcast('scroll.infiniteScrollComplete');
                    }
                    }).error(function (data) {

                    });

                };
                ctrl._getRange = function getRange(currentDate) {
                    var year = currentDate.getFullYear(),
                        month = currentDate.getMonth(),
                        date = currentDate.getDate(),
                        day = currentDate.getDay(),
                        difference = day - ctrl.startingDayWeek,
                        firstDayOfWeek,
                        endTime;

                    if (difference < 0) {
                        difference += 7;
                    }

                    firstDayOfWeek = new Date(year, month, date - difference);
                    endTime = new Date(year, month, date - difference + 7);

                    return {
                        startTime: firstDayOfWeek,
                        endTime: endTime
                    };
                };
                
                ctrl.registerSlideChanged(scope);
               
                ctrl.refreshView();
            }
        };
    }])
    .directive('dayview', ['dateFilter', function (dateFilter) {
        'use strict';
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'templates/rcalendar/day.html',
            require: '^calendar',
            link: function (scope, element, attrs, ctrl) {
                scope.formatHourColumn = ctrl.formatHourColumn;

                ctrl.mode = {
                    step: {days: 1}
                };

                scope.allDayLabel = ctrl.allDayLabel;
                scope.hourParts = ctrl.hourParts;
                scope.allDayEventTemplateUrl = ctrl.dayviewAllDayEventTemplateUrl;
                scope.normalEventTemplateUrl = ctrl.dayviewNormalEventTemplateUrl;
                scope.day_event="no_events";
                function createDateObjects(startTime) {
                    var rows = [],
                        time,
                        currentHour = startTime.getHours(),
                        currentDate = startTime.getDate();

                    for (var hour = 0; hour < 24; hour += 1) {
                        time = new Date(startTime.getTime());
                        time.setHours(currentHour + hour);
                        time.setDate(currentDate);
                        rows.push({
                            time: time
                        });
                    }
                    return rows;
                }

                function compareEventByStartOffset(eventA, eventB) {
                    return eventA.startOffset - eventB.startOffset;
                }

                scope.select = function (selectedTime, events) {
                    if (scope.timeSelected) {
                        var disabled;
                        if (scope.isDateDisabled) {
                            disabled = scope.isDateDisabled({date: selectedTime});
                        }
                        scope.timeSelected({selectedTime: selectedTime, events: events, disabled: disabled || false});
                    }
                };

                ctrl._onDataLoaded = function () {
                    var eventSource = ctrl.eventSource,
                        hour,
                        len = eventSource ? eventSource.length : 0,
                        startTime = ctrl.range.startTime,
                        endTime = ctrl.range.endTime,
                        utcStartTime = new Date(Date.UTC(startTime.getFullYear(), startTime.getMonth(), startTime.getDate())),
                        utcEndTime = new Date(Date.UTC(endTime.getFullYear(), endTime.getMonth(), endTime.getDate())),
                        currentViewIndex = scope.currentViewIndex,
                        rows = scope.views[currentViewIndex].rows,
                        allDayEvents = scope.views[currentViewIndex].allDayEvents = [],
                        oneHour = 3600000,
                        eps = 0.016,
                        eventSet,
                        normalEventInRange = false;
                        scope.day_event=eventSource;

                    
                    for (hour = 0; hour < 24; hour += 1) {
                        rows[hour].events = [];
                    }

                    for (var i = 0; i < len; i += 1) {
                        var event = eventSource[i];
                        var eventStartTime = new Date(event.startTime);
                        var eventEndTime = new Date(event.endTime);

                        if (event.allDay) {
                            if (eventEndTime <= utcStartTime || eventStartTime >= utcEndTime) {
                                continue;
                            } else {
                                allDayEvents.push({
                                    event: event
                                });
                            }
                        } else {
                            if (eventEndTime <= startTime || eventStartTime >= endTime) {
                                continue;
                            } else {
                                normalEventInRange = true;
                            }

                            var timeDiff;
                            var timeDifferenceStart;
                            if (eventStartTime <= startTime) {
                                timeDifferenceStart = 0;
                            } else {
                                timeDiff = eventStartTime - startTime - (eventStartTime.getTimezoneOffset() - startTime.getTimezoneOffset()) * 60000;
                                timeDifferenceStart = timeDiff / oneHour;
                            }

                            var timeDifferenceEnd;
                            if (eventEndTime >= endTime) {
                                timeDiff = endTime - startTime - (endTime.getTimezoneOffset() - startTime.getTimezoneOffset()) * 60000;
                                timeDifferenceEnd = timeDiff / oneHour;
                            } else {
                                timeDiff = eventEndTime - startTime - (eventEndTime.getTimezoneOffset() - startTime.getTimezoneOffset()) * 60000;
                                timeDifferenceEnd = timeDiff / oneHour;
                            }

                            var startIndex = Math.floor(timeDifferenceStart);
                            var endIndex = Math.ceil(timeDifferenceEnd - eps);
                            var startOffset = 0;
                            var endOffset = 0;
                            if (ctrl.hourParts !== 1) {
                                startOffset = Math.floor((timeDifferenceStart - startIndex) * ctrl.hourParts);
                                endOffset = Math.floor((endIndex - timeDifferenceEnd) * ctrl.hourParts);
                            }

                            /*var displayEvent = {
                                event: event,
                                startIndex: startIndex,
                                endIndex: endIndex,
                                startOffset: startOffset,
                                endOffset: endOffset
                            };

                            eventSet = rows[startIndex].events;
                            if (eventSet) {
                                eventSet.push(displayEvent);
                            } else {
                                eventSet = [];
                                eventSet.push(displayEvent);
                                rows[startIndex].events = eventSet;
                            }*/
                        }
                    }

                    if (normalEventInRange) {
                        var orderedEvents = [];
                        for (hour = 0; hour < 24; hour += 1) {
                            if (rows[hour].events) {
                                rows[hour].events.sort(compareEventByStartOffset);

                                orderedEvents = orderedEvents.concat(rows[hour].events);
                            }
                        }
                        if (orderedEvents.length > 0) {
                            ctrl.placeEvents(orderedEvents);
                        }
                    }
                    
                };

                ctrl._refreshView = function () {
                    ctrl.populateAdjacentViews(scope);
                   
                   
                };

                ctrl._getTitle = function () {
                    var startingDate = ctrl.range.startTime;
                    return dateFilter(startingDate, ctrl.formatDayTitle).toUpperCase();
                };
                ctrl._subTitle = function () {
                    var startingDate = ctrl.range.startTime;
                    return  startingDate.toLocaleString("en-us", { month: "short" }).toUpperCase()+" "+("0" + startingDate.getDate()).slice(-2);
                };
                ctrl._getViewData = function (startTime) {
                    return {
                        rows: createDateObjects(startTime),
                        allDayEvents: []
                    };
                };

                ctrl._getRange = function getRange(currentDate) {
                    var year = currentDate.getFullYear(),
                        month = currentDate.getMonth(),
                        date = currentDate.getDate(),
                        startTime = new Date(year, month, date),
                        endTime = new Date(year, month, date + 1);

                    return {
                        startTime: startTime,
                        endTime: endTime
                    };
                };
                 
                ctrl.registerSlideChanged(scope);
                ctrl.refreshView();
            }
            
        };
        
    }]);

angular.module("templates/rcalendar/calendar.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("templates/rcalendar/calendar.html",
    "<div class=\"calendar-container\" ng-switch=\"calendarMode\">\n" +
        "<dayview ng-switch-when=\"day\"></dayview>\n" +
        "<monthview ng-switch-when=\"month\"></monthview>\n" +
        "<weekview ng-switch-when=\"week\"></weekview>\n" +
    "</div>");
}]);

angular.module("templates/rcalendar/day.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("templates/rcalendar/day.html",
    "<div class=\"dayview\">\n" +
    "<ion-slide-box class=\"dayview-slide\" on-slide-changed=\"slideChanged($index)\" does-continue=\"true\" show-pager=\"false\" delegate-handle=\"dayview-slide\">\n" +
        "<ion-slide  ng-repeat=\"view in views track by $index\">\n" +
            "<div class=\"dayview-allday-table_1\" id=\"slide_{{$index}}\">\n" +
                "<div ng-if=\"day_event != 'no_events'\" class=\"scrollable1\" >\n" +
                    "<div ng-repeat=\"dy in day_event\">\n" +
                        "<div  ng-repeat=\"dt in dy.day_events\" class=\"row item pad0 mtop10 border_none back_none color_fff\">\n" +
                            "<div class=\"col pad0\">\n" +
                                "<div class=\"txtcenter pad10 padright7 item-text-wrap border_none\">\n" +
                                    "<div class=\"item bg_day_trans color_fff border0 pad5imp lineheight25\">\n" +
                                        "<div class=\"pad0\">\n" +
                                            "<div ng-click=\"eventSelected({event: dt})\" class=\"curpoint col col-55 pad5 events_details\">\n" +
                                                "<div class=\"event_title fsize20\" style=\"color:{{dt.team_color}}\">{{dt.team_name}}</div>\n" +
                                                "<div class=\"sub_text fweight\">{{dt.title}}<span class=\"link_text\" >{{dt.title_link_text}}</span></div>\n" +
                                                "<div class=\"sub_text fsize16\">{{dt.event_time}}</div>\n" +
                                                "<div class=\"sub_text fsize16\">With <span class=\"link_text\">{{dt.user_name}}</span></div>\n" +
                                            "</div>\n" +
                                        "</div>\n" +
                                    "</div>\n" +
                                "</div>\n" +
                            "</div>\n" +
                        "</div>\n" +
                    "</div>\n" +
                "</div>\n" +
                "<div ng-if=\"day_event == null || day_event == ''\">\n" +
                    "<div class=\"col pad0\">\n" +
                        "<div class=\"txtcenter pad10 padright7 item-text-wrap border_none\">\n" +
                            "<div class=\"item bg_day_trans color_fff border0 pad5imp lineheight25\">\n" +
                                "<div class=\"pad0\">\n" +
                                    "<div class=\"col col-55 pad5 events_details\">\n" +
                                        "<div class=\"event_title fsize20\">No Sessions Found...!</div>\n" +
                                    "</div>\n" +
                                "</div>\n" +
                            "</div>\n" +
                        "</div>\n" +
                    "</div>\n" +
                "</div>\n" +
            "</div>\n" +
        "</ion-slide>\n" +
    "</ion-slide-box>\n" +
"</div>\n" +
    "");
}]);

angular.module("templates/rcalendar/displayEvent.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("templates/rcalendar/displayEvent.html",
    "<div class=\"calendar-event-inner\">{{displayEvent.event.title}}</div>");
}]);

angular.module("templates/rcalendar/month.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("templates/rcalendar/month.html",
    "<div>\n" +
    "<ion-slide-box class=\"monthview-slide\" on-slide-changed=\"slideChanged($index)\" does-continue=\"true\" show-pager=\"false\" delegate-handle=\"monthview-slide\">\n" +
        "<ion-slide ng-repeat=\"view in views track by $index\">\n" +
            "<div class=\"jsCalendar\">\n" +
                "<table ng-if=\"$index === currentViewIndex\" class=\"cal_table\">\n" +
                    "<thead>\n" +
                        "<tr class=\"jsCalendar-week-days\">\n" +
                            "<th ng-repeat=\"label in labels track by $index\">\n" +
                                "<small>{{label}}</small>\n" +
                            "</th>\n" +
                        "</tr>\n" +
                    "</thead>\n" +
                    "<tbody>\n" +
                        "<tr ng-repeat=\"row in [0, 1, 2, 3, 4, 5]\">\n" +
                            "<td ng-repeat=\"col in [0, 1, 2, 3, 4, 5, 6]\" ng-click=\"select(view.dates[row * 7 + col])\" ng-class=\"getHighlightClass(view.dates[row * 7 + col])\" ng-include=\"::displayEventTemplateUrl\"></td>\n" +
                        "</tr>\n" +
                    "</tbody>\n" +
                "</table>\n" +
            "</div>\n" +
            "<div class=\"jsCalendar\">\n" +
                "<table ng-if=\"$index !== currentViewIndex\" class=\"cal_table\">\n" +
                    "<thead>\n" +
                        "<tr class=\"jsCalendar-week-days\">\n" +
                            "<th ng-repeat=\"label in labels track by $index\">\n" +
                                "<small>{{label}}</small>\n" +
                            "</th>\n" +
                        "</tr>\n" +
                    "</thead>\n" +
                    "<tbody>\n" +
                        "<tr ng-repeat=\"row in [0, 1, 2, 3, 4, 5]\">\n" +
                            "<td ng-repeat=\"col in [0, 1, 2, 3, 4, 5, 6]\">{{view.dates[row * 7 + col].label}}</td>\n" +
                        "</tr>\n" + 
                    "</tbody>\n" +
                "</table>\n" +
            "</div>\n" +
        "</ion-slide>\n" +
    "</ion-slide-box>\n" +
    "<table class=\"mon_event_detail\">\n" +
        "<tr><td colspan=\"2\"><div class=\"event_detail_title\">{{evt_detail_title}}</div></td></tr>\n" +
        "<tr ng-repeat=\"event in selectedDate.events\" ng-click=\"eventSelected({event:event})\" style=\"color:{{event.team_color}}\">\n" +
            "<td width=\"20%\" ng-if=\"!event.allDay\" class=\"txtright monthview-eventdetail-timecolumn\">{{event.event_time}}</td>\n" +
            "<td width=\"80%\" ng-if=\"event.allDay\" class=\"monthview-eventdetail-timecolumn\">All day</td>\n" +
            "<td class=\"event-detail  evt_title_td\"><div class=\"event_title1\">{{event.title}}</div></td>\n" +
        "</tr>\n" +
        "<tr ng-if=\"!selectedDate.events\">\n" +
            "<td ng-if=\"evt_detail_title != ''\" class=\"no-event-label\">\n" +
                "<div class=\"col pad0\">\n" +
                    "<div class=\"txtcenter pad10 padright7 item-text-wrap border_none\">\n" +
                        "<div class=\"item bg_day_trans color_fff border0 pad5imp lineheight25\">\n" +
                            "<div class=\"pad0\">\n" +
                                "<div class=\"col col-55 pad5 events_details\">\n" +
                                    "<div class=\"event_title\">No Sessions Found...!</div>\n" +     
                                "</div>\n" +                                    
                            "</div>\n" +
                        "</div>\n" +  
                    "</div>\n" +                       
                "</div>\n" +
            "</td>\n" +
        "</tr>\n" +
    "</table>\n" +
"</div>\n" +
    "");
}]);

angular.module("templates/rcalendar/monthviewDisplayEvent.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("templates/rcalendar/monthviewDisplayEvent.html",
    "{{view.dates[row*7+col].label}}");
}]);

angular.module("templates/rcalendar/monthviewEventDetail.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("templates/rcalendar/monthviewEventDetail.html",
    "<ion-content class=\"event-detail-container\" has-bouncing=\"false\" ng-show=\"showEventDetail\" overflow-scroll=\"false\">\n" +
        "<div class=\"clear\"></div>\n" +
        "<div class=\"jsCalendar\">\n" +
            "<table class=\"mon_event_detail\">\n" +
                "<tr><td colspan=\"2\"><div class=\"event_detail_title\">{{evt_detail_title}}</div></td></tr>\n" +
                "<tr ng-repeat=\"event in selectedDate.events\" ng-click=\"eventSelected({event:event})\" style=\"color:{{event.team_color}}\">\n" +
                    "<td width=\"10%\" ng-if=\"!event.allDay\" class=\"txtright monthview-eventdetail-timecolumn\">{{event.event_time}}</td>\n" +
                    "<td width=\"90%\" ng-if=\"event.allDay\" class=\"monthview-eventdetail-timecolumn\">All day</td>\n" +
                    "<td class=\"event-detail  evt_title_td\"><div class=\"event_title1\">{{event.title}}</div></td>\n" +
                "</tr>\n" +
                "<tr ng-if=\"!selectedDate.events\">\n" +
                    "<td class=\"no-event-label\" ng-bind=\"::noEventsLabel\"></td>\n" +
                "</tr>\n" +
            "</table>\n" +
        "</div>\n" +
    "</ion-content>\n" +
    "");
}]);

angular.module("templates/rcalendar/week.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("templates/rcalendar/week.html",
    "<div class=\"weekview\">\n" +
    "<div ng-if=\"$index !== currentViewIndex\">\n" +
        "<div  class=\"weekview-allday-table\">\n" +
            "<ion-content  style=\"height: 82vh;\" class=\"weekview-allday-content-wrapper1\" has-bouncing=\"false\" overflow-scroll=\"false\">\n" +
                "<table class=\"table\">\n" +
                    "<tbody>\n" +
                        "<tr ng-repeat=\"wk in week_event\">\n" +
                            "<td class=\"week_title_td\"><div class=\"txt_cap\">{{wk.week_td_title| date: formatWeekViewDayHeader}}<div><div class=\"fweight\">{{wk.week_td_date}}</div></td>\n" +
                            "<td class=\"week_event_details_td\" id=\"show_less_{{$index}}\">\n" +
                                "<div ng-if=\"$index < '3' \" class =\"curpoint col-xs-12 pad0\" ng-click=\"eventSelected({event:wk.wk_events[$index]})\" ng-repeat=\"wk_dt in wk.wk_events\">\n" +
                                    "<div class=\"col-xs-3 pad0 txtright\"><span>{{wk_dt.event_time}}</span></div>\n" +
                                    "<div class=\"col-xs-1 pad0 txtcenter\"><span class=\"disp_inlineblock wk_event\" style=\"background:{{wk_dt.team_color}}\"></span></div>\n" +
                                    "<div class=\"col-xs-8 pad0 \"><span class=\"txt_nowrap\">{{wk_dt.title}}</span></div>\n" +
                                "</div>\n" +
                                "<div class=\"fright curpoint\" ng-click=\"show_more($index)\">{{wk.view_more}}</div>\n" + 
                            "</td>\n" +
                            "<td class=\"notdisplay week_event_details_td\" id=\"show_more_{{$index}}\">\n" +
                                "<div class=\"col-xs-12 pad0\"  ng-click=\"eventSelected({event:wk.wk_events[$index]})\" ng-repeat=\"wk_dt in wk.wk_events\">\n" +
                                    "<div class=\"col-xs-3 pad0 txtright\"><span>{{wk_dt.event_time}}</span></div>\n" +
                                    "<div class=\"col-xs-1 pad0 txtcenter\"><span class=\"disp_inlineblock wk_event\" style=\"background:{{wk_dt.team_color}}\"></span></div>\n" +
                                    "<div class=\"col-xs-8 pad0 \"><span class=\"txt_nowrap\">{{wk_dt.title}}</span></div>\n" +
                                "</div>\n" +
                            "</td>\n" +
                        "</tr>\n" +
                    "</tbody>\n" +
                "</table>\n" +
                "<ion-spinner ng-show=\"loading\"></ion-spinner>\n" +
                "<div class=\"clear\"></div>\n" +
               
                "<ion-infinite-scroll ng-if=\"week_event!= null\" on-infinite =\"loadData({{week_end_date}})\" distance=\"7%\"></ion-infinite-scroll>\n" +
            "</ion-content>\n" +
        "</div>\n" +
    "</div>\n" +
"</div>\n" +
    "");
}]);
