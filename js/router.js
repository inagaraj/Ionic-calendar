app.config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
        //sidebar
        .state('news', {
            url: "/news",
            abstract: true,
            templateUrl: "templates/sidebar-menu.html"
        })

        

        .state('main', {
            url: "/main",
            templateUrl: "templates/calendar.html",
            controller: "CalendarCtrl"
        })

        
        
       
        
        
        
        
        
        
        
        
        
        $urlRouterProvider.otherwise("/main");
        
        
        
    /*if (localStorage.svsef_registered == 'true' && (typeof localStorage.svsef_registered) != 'undefined')
    {
        if (localStorage.svsef_loggedin == 'true' && (typeof localStorage.svsef_loggedin) != 'undefined')
        {
            $urlRouterProvider.otherwise("/profile_setup");
        }
        else
        {
            $urlRouterProvider.otherwise("/main");
        }
    }
    else
    {
        $urlRouterProvider.otherwise("/main");
    }*/
})