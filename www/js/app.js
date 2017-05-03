String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
    var subjectString = this.toString();
    if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
      position = subjectString.length;
    }
    position -= searchString.length;
    var lastIndex = subjectString.indexOf(searchString, position);
    return lastIndex !== -1 && lastIndex === position;
  };
}

/* application constants */
var platform = ionic.Platform.platform()
if (platform != null) {
  platform = platform.capitalizeFirstLetter()
}

var appStoreUrl = ''

/* production */
var client = contentful.createClient({
  space: '',
  accessToken: ''
})

var app = angular.module('starter', ['ionic', 'ngCordova'])

.service('CalendarService', function($q) {
  var _events = [];
  var _event = null;

  return {
    setEvents: function(events) {
      _events = events
    },

    getEvents: function() {
      return _events
    },

    getEvent: function(eventId, callback) {
      console.log('CalendarService.getEvent', 'events length', _events.length)

      var event = null
      for(var i = 0; _events && i < _events.length; ++i) {
        var obj = _events[i]
        if(obj.sys.id == eventId) {
          event = obj
          break;
        }
      }

      console.log('CalendarService.getEvent', 'event', event)
      callback(event)
    }
  }
})

.service('FaqService', function($q) {
  var _entries = [];
  var _entry = null;

  return {
    setEntries: function(entries) {
      _entries = entries
    },

    getEvents: function() {
      return _entries
    },

    getEntry: function(faqId, callback) {
      console.log('FaqService.getEntry', 'entries length', _entries.length)

      var entry = null
      for(var i = 0; _entries && i < _entries.length; ++i) {
        var obj = _entries[i]
        if(obj.sys.id == faqId) {
          entry = obj
          break;
        }
      }

      console.log('FaqService.getEntry', 'entry', event)
      callback(entry)
    }
  }
})

  .service('ConfigService', function ($q) {
    var _discussion;
    var _website;

    return {
      initConfig: function () {
        client.entries(
          { content_type: 'config',
            order: '-sys.updatedAt' })
          .then(function (entries) {
            if (entries.length > 0) {
              var data = entries[0].fields;
              _discussion = data['discussion'];
              _website = data['website'];
            }
            console.log(_discussion, _website)
          })
      },

      getDiscussionURL: function () {
        return _discussion;
      },

      getWebsiteURL: function () {
        return _website;
      }
    }
  })

.run(function ($rootScope, ConfigService) {
  ConfigService.initConfig();
})

// Document
.controller('DocumentController', function($scope, $q, $cordovaSocialSharing) {
  var isSharing = false;

  client.entries(
  { content_type: 'document',
    order: '-sys.updatedAt' })
  .then(function (entries) {
    entries.forEach(function(e){
      var str = e.sys.updatedAt
      if (str) {
        var dict = {}

        var datetime = new Date(Date.parse(str))
        dict['updatedAt'] = DateFormat.format.date(datetime, "MMM dd yyyy")

        e.fields['output'] = dict
      }
    })

    $scope.$apply(function(){
      $scope.entries = entries
    })
  })

  $scope.selectedItem = function(entry) {
    console.log(entry);
    var url, title;

    if (entry.fields['link']) {
      title = entry.fields['title'];
      url = entry.fields['link'];

    } else if (entry.fields['file']) {
      title = entry.fields['file'].fields['title']
      var fileUrl = 'http:' + entry.fields['file'].fields['file'].url
      url = fileUrl

      if (!fileUrl.endsWith('mp4')) {
        url = 'http://docs.google.com/gview?embedded=true&url=' + fileUrl
      }


      console.log('DocCtrl', 'selectedItem', url)
    }

    cordova.ThemeableBrowser.open(url, '_blank', {
      statusbar: {
        color: '#ffffffff'
      },
      toolbar: {
        height: 44,
        color: '#1B5E20'
      },
      title: {
        color: '#ffffff',
        staticText: title,
        showPageTitle: true
      },
      closeButton: {
        image: 'ic_close',
        imagePressed: 'close_pressed',
        align: 'left',
        event: 'closePressed'
      },
      customButtons: [
        {
          image: 'ic_share',
          imagePressed: 'share_pressed',
          align: 'right',
          event: 'sharePressed'
        }
      ],

    }).addEventListener('sharePressed', function(e) {
      if (isSharing) return;

      var subject = entry.fields.title
      var message = '"'+ subject +'", '+ fileUrl +'. Shared from Envision Campbell ' + platform + '.'
      var file = null
      var link = appStoreUrl

      $cordovaSocialSharing
        .share(message, subject, file, link) // Share via native share sheet
        .then(function(result) {
          // Success!
          isSharing = false;

        }, function(err) {
          // An error occured. Show a message to the user
          alert('There is a problem with sharing.')
        });

    })
  }
})

// Calendar
.controller('CalendarController', function($scope, $stateParams, CalendarService) {

  client.entries(
  { content_type: 'event',
    order: '-fields.startTime' })
  .then(function (entries) {
    entries.forEach(function(e){
      var str = e.fields.startTime
      if (str) {
        var datetime = new Date(Date.parse(str))

        var dict = {}
        dict['month'] = DateFormat.format.date(datetime, "MMM")
        dict['day'] = DateFormat.format.date(datetime, "dd")
        dict['time'] = DateFormat.format.date(datetime, "HH:mm")

        e.fields['startTimeOutput'] = dict
      }
    })
    $scope.$apply(function(){
      CalendarService.setEvents(entries)
      $scope.entries = entries
    })
  })
})

.controller('EventController', function($scope, $stateParams, CalendarService, $cordovaCalendar, $ionicPopup, $compile) {
  console.log('EvtCtrl', 'eventId: ' + $stateParams.eventId)

  $scope.init = function() {
    var latLng = {lat: $scope.entry.fields.location.lat, lng: $scope.entry.fields.location.lon};

    var map = new google.maps.Map(document.getElementById('map'), {
      center: latLng,
      zoom: 16,
      disableDefaultUI: true,
      disableDoubleClickZoom: true,
      draggable: false,
    });

    var marker = new google.maps.Marker({
      map: map,
      position: latLng,
      draggable: true //work around for crash upon dragging on Nexus 6/6P
    });

    // work around for crash upon dragging on Nexus 6/6P
    marker.addListener('drag', function() {
      marker.setPosition(latLng)
    })

    $scope.map = map;
  }

  CalendarService.getEvent($stateParams.eventId, function(entry) {
    console.log('EvtCtrl', 'entry:' + entry)
    if (!entry) return;

    $scope.entry = entry

    // datetime
    var dict = {}

    var str = entry.fields.startTime
    var datetime = new Date(Date.parse(str))
    dict['startTime'] = DateFormat.format.date(datetime, "MMM dd yyyy, HH:mm")

    str = entry.fields.endTime
    datetime = new Date(Date.parse(str))
    dict['endTime'] = DateFormat.format.date(datetime, "MMM dd yyyy, HH:mm")

    entry.fields['output'] = dict

    // location
    if (entry.fields.location) {

    }
  })

  $scope.addToCalendar = function() {
    var e = $scope.entry

    $cordovaCalendar.createEvent({
      title: e.fields.title,
      location: e.fields.address,
      notes: e.fields.description,
      startDate: new Date(Date.parse(e.fields.startTime)),
      endDate: new Date(Date.parse(e.fields.endTime))
    }).then(function (result) {
      // success
      $ionicPopup.alert({
        title: 'Event added to calendar!'
      });
    }, function (err) {
      // error
      $ionicPopup.alert({
        title: 'Cannot add event to calendar'
      });
    });
  }

})

// FAQ
.controller('FaqController', function($scope, $stateParams, FaqService) {

  client.entries(
  { content_type: 'faq',
    order: '-sys.updatedAt' })
  .then(function (entries) {
    FaqService.setEntries(entries)
    $scope.$apply(function(){
      $scope.entries = entries
    })
  })

})

// FAQ Detail
.controller('FaqDetailController', function($scope, $stateParams, FaqService) {

  FaqService.getEntry($stateParams.faqId, function(entry) {
    console.log('FaqDetCtrl', 'entry', entry)
    $scope.entry = entry

    var str = entry.sys.updatedAt
    if (str) {
      var dict = {}

      var datetime = new Date(Date.parse(str))
      dict['updatedAt'] = DateFormat.format.date(datetime, "MMM dd yyyy")

      entry.fields['output'] = dict
    }

  })

})

// Home
.controller('HomeController', function($scope, $stateParams, $cordovaSocialSharing, ConfigService) {
  ionic.Platform.fullScreen(true, true);

  $scope.openDiscussion = function () {
    $scope.openUrl(ConfigService.getDiscussionURL());
  };

  $scope.openWebsite = function () {
    $scope.openUrl(ConfigService.getWebsiteURL());
  };

  var isSharing = false;
  $scope.openUrl = function(url) {
    cordova.ThemeableBrowser.open(url, '_blank', {
      statusbar: {
          color: '#ffffffff'
      },
      toolbar: {
          height: 44,
          color: '#1B5E20'
      },
      title: {
          color: '#ffffff',
          showPageTitle: true
      },
      backButton: {
          image: 'ic_left',
          imagePressed: 'back_pressed',
          align: 'left',
          event: 'backPressed'
      },
      forwardButton: {
          image: 'ic_right',
          imagePressed: 'forward_pressed',
          align: 'left',
          event: 'forwardPressed'
      },
      closeButton: {
          image: 'ic_close',
          imagePressed: 'close_pressed',
          align: 'left',
          event: 'closePressed'
      },
      customButtons: [
          {
              image: 'ic_share',
              imagePressed: 'share_pressed',
              align: 'right',
              event: 'sharePressed'
          },
          // {
//               image: 'ic_open_in_browser_white_24dp',
//               imagePressed: 'open_in_browser_pressed',
//               align: 'right',
//               event: 'browserPressed'
//           },
      ],

    }).addEventListener('sharePressed', function(e) {
      if (isSharing) return;

      var subject = 'Shared from Envision Campbell'
      var message = 'Visit '+ url +'. Shared from Envision Campbell '+ platform +'.'
      var file = null
      var link = appStoreUrl

      $cordovaSocialSharing
      .share(message, subject, file, link) // Share via native share sheet
      .then(function(result) {
        // Success!
        isSharing = false;

      }, function(err) {
        // An error occured. Show a message to the user
        alert(err)
      });

    })
  }

  $scope.mailTo = function(email) {
    if(window.plugins && window.plugins.emailComposer) {
        window.plugins.emailComposer.showEmailComposerWithCallback(function(result) {
            console.log("Response -> " + result);
        },
        "Feedback for Envision Campbell", // Subject
        "",                      // Body
        [email],                 // To
        null,                    // CC
        null,                    // BCC
        false,                   // isHTML
        null,                    // Attachments
        null);                   // Attachment Data
    }

  }
})

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    if(window.cordova && window.cordova.plugins.Keyboard) {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

      // Don't remove this line unless you know what you are doing. It stops the viewport
      // from snapping when text inputs are focused. Ionic handles this internally for
      // a much nicer keyboard experience.
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {
  $urlRouterProvider.otherwise('/')

  $stateProvider
  .state('home', {
    url: '/',
    templateUrl: 'home.html',
    controller: 'HomeController'
  })
  .state('documents', {
    url: '/documents',
    templateUrl: 'documents.html',
    controller: 'DocumentController'
  })
  .state('calendar', {
    url: '/calendar',
    templateUrl: 'calendar.html',
    controller: 'CalendarController'
  })
  .state('event', {
    url: '/event/:eventId',
    templateUrl: 'event.html',
    controller: 'EventController'
  })
  .state('faqs', {
    url: '/faqs',
    templateUrl: 'faqs.html',
    controller: 'FaqController'
  })
  .state('faq', {
    url: '/faq/:faqId',
    templateUrl: 'faq.html',
    controller: 'FaqDetailController'
  })
})

