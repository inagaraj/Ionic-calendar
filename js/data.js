// friends factory
app.factory('NewsApp', ['$http', 'Config', '$httpParamSerializerJQLike', function ($http, Config, $httpParamSerializerJQLike) {
    var data = {};
    data.get_events_data = function (mode, startTime, endTime, current_date)
    {
        return $http(
            {
                method: 'GET', url: Config.WebUrl + '?action=getcalendarevents&mode=' + mode + '&startTime=' + startTime + '&endTime=' + endTime + '&current_date=' + current_date 
            }
        );
    }
    data.get_load_events_data = function (end_date)
    {
        return $http(
            {
                method: 'GET', url: Config.WebUrl + 'news/getloadevents?end_date=' + end_date 
            }
        );
    }
    return data;
}]);