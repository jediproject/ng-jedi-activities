# ng-jedi-activities
Easy way to manage time-consuming requests.
###### Written in [AngularJs](https://angularjs.org/)

  1. [Install](#install)
  1. [How To Use](#how-to-use)

### Install

* Install the dependency:

   ```shell
bower install ng-jedi-activities --save
   ```
* Add activities.css to your code:

   ```html
<link rel='stylesheet' href='assets/css/activities.css' type='text/css' media='all' />
   ```
* Add activities.js to your code:

   ```html
<script src='assets/libs/ng-jedi-activities/activities.js'></script>   
   ```
   - Note that the base directory used was assets/libs, you should change bower_components to assets/libs or move from bower_components to assets/libs with [Grunt](http://gruntjs.com/).
* Add the directive to your HTML:

    ```html
<jd-activity></jd-activity>
    ```
* Include module dependency:

   ```javascript
angular.module('yourApp', ['jedi.activities']);
   ```
======

### How To Use

  1. [initActivity](#initactivity)
  1. [clearActivities](#clearactivities)
  1. [toggle](#toggle)
  1. [hasInProgressActivities](#hasinprogressactivities)
  1. [hasActivities](#hasactivities)
  1. [ActivitiesConfig](#activitiesconfig)

#### initActivity

This is what you are going to use to make the requests to your back-end service.

Keep in mind that the user will be notified if he tries to close the page, refresh and navigate back and forward using the browser in case there is an activity in progress. But he will be able to navigate throughout an angular application normally.

```javascript
app.controller(['jedi.activities.ActivitiesService', function(activitiesService){
    activitiesService.initActivity(urlBase, apiUrl, method, params, name);

    //urlBase -> The base url to your back-end service.
    //apiUrl -> The action that you want to trigger.
    //method -> GET/POST...
    //params -> Additional parameters for the request.
    //name -> The name that will be displayed for the activity.
}])
```

It is as simple as that.

#### clearActivities

This clears all the activities despite their status.

```javascript
activitiesService.clearActivities();
```

#### toggle

Use this to toggle the directive open/close.

```javascript
activitiesService.toggle();
```

#### hasInProgressActivities

Returns true if there is any activity in progress. False otherwise.

```javascript
activitiesService.hasInProgressActivities();
```

#### hasActivities

Returns true if there is any activity in the directive despite their status. False otherwise.

```javascript
activitiesService.hasActivities();
```

#### ActivitiesConfig

Some configuration that you can use.

   ```javascript
app.config(['jedi.activities.ActivitiesConfig', function(ActivitiesConfig){
  //Receives a string with some directive to translate the directive's header. e.g.:
  ActivitiesConfig.i18nDirective = 'jd-i18n';

  //In case you want to display another message when the user tries to leave the page.
  ActivitiesConfig.inProgressWarning = 'A custom message.';
}]);
   ```

- You can use {{count}} in the warning string to indicate the number os activities in progress that the user will lose because we are using angular's [$interpolate](https://docs.angularjs.org/api/ng/service/$interpolate).

**[Back to top](#ng-jedi-activities)**
