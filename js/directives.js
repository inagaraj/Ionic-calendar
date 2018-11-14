app.directive('menuCloseKeepHistory', ['$ionicHistory', function($ionicHistory) {
    return {
        restrict: 'AC',
        link: function($scope, $element) {
            $element.bind('click', function() {
                var sideMenuCtrl = $element.inheritedData('$ionSideMenusController');
                if (sideMenuCtrl) {
                    $ionicHistory.nextViewOptions({
                        historyRoot: false,
                        disableAnimate: true,
                        expire: 300
                    });
                    sideMenuCtrl.close();
                }
            });
        }
    };
}]);
app.directive('dir', function($compile, $parse) {
 return {
	restrict: 'E',
	link: function(scope, element, attr) {
	  scope.$watch(attr.content, function() {
		 element.html($parse(attr.content)(scope));
		 $compile(element.contents())(scope);
	  }, true);
	}
 }
})
// filters
app.filter('cut', function () {
  return function (value, wordwise, max, tail) {
		if (!value) return '';

		max = parseInt(max, 10);
		if (!max) return value;
		if (value.length <= max) return value;

		value = value.substr(0, max);
		if (wordwise) {
			 var lastspace = value.lastIndexOf(' ');
			 if (lastspace != -1) {
				  value = value.substr(0, lastspace);
			 }
		}

		return value + (tail || ' …');
  };
});
app.directive('drawer', ['$rootScope', '$ionicGesture','$document', function ($rootScope, $ionicGesture, $document) {
        return {
            restrict: 'E',
            controller: 'NewsCtrl',
            link: function ($scope, $element, $attr, ctrl) {
                $element.addClass($attr.side);
                $document.on('click', function($event) {
                    $event.stopImmediatePropagation();
                    if(!angular.element($event.target).hasClass('icon_menuclick'))
                    {
                        $scope.menuClose();
                    }
                });
                $scope.openDrawer = function () {
                    ctrl.open();
                    ctrl.setState('open');
                };
                $scope.closeDrawer = function () {
                    ctrl.close();
                    ctrl.setState('close');
                };
                $scope.toggleDrawer = function () {
                    if (ctrl.isOpen()) {
                        ctrl.close();
                        ctrl.setState('close');
                        return "close";
                    } else {
                        ctrl.open();
                        ctrl.setState('open');
                        return "open";
                    }
                };
                $scope.menuClose = function () {
                    if (ctrl.isOpen()) {
                        ctrl.close();
                        ctrl.setState('close');
                        return "close";
                    }
                };
            }
        }
    }])

app.directive('drawerClose', ['$rootScope', function ($rootScope) {
        return {
            restrict: 'A',
            link: function ($scope, $element) {
                $element.bind('click', function () {
                    var NewsCtrl = $element.inheritedData('$drawerController');
                    NewsCtrl.close();
                });
            }
        }
    }])

app.directive('drawerToggle', function () {
    return {
        restrict: 'A',
        link: function ($scope, $element, $attrs) {
            var el = $element[0];
            if ($attrs.animate === "true") {
                $element.addClass('animate drawerToggle');
            }

            $element.bind('click', function () {
                if ($attrs.animate === "true") {
                    if ($scope.toggleDrawer() === "open") {
                        el.style.transform = el.style.webkitTransform = 'translate3d(' + -5 + 'px, 0, 0)';
                    } else {
                        el.style.transform = el.style.webkitTransform = 'translate3d(' + 0 + 'px, 0, 0)';
                    }
                } else {
                    $scope.toggleDrawer();
                }
            });
        }
    };
})

app.directive('multiselect2', [function() {
    return function(scope, element, attributes) {
        element.multiselect({
             /*onChange: function (optionElement, checked) {
                optionElement.removeAttr('selected');
                if (checked) {
                    optionElement.prop('selected', 'selected');
                }
                element.change();
            }*/
        });
        // Watch for any changes to the length of our select element
        scope.$watch(function () {
            return element[0].length;
        }, function () {
            element.multiselect('rebuild');
        });
        
        // Watch for any changes from outside the directive and refresh
        scope.$watch(attributes.ngModel, function () {
            element.multiselect('refresh');
        });
        
        
        // Below maybe some additional setup
    }
}]);

app.directive('multiSelect', function() {

  function link(scope, element) {
    var options = {
      enableClickableOptGroups: true,
      onChange: function() {
        element.change();
      }
    };
    element.multiselect(options);
  }

  return {
    restrict: 'A',
    link: link
  };
});

