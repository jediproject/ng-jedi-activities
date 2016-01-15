# [ng-jedi-activities](https://github.com/jediproject/ng-jedi-activities)

Easy way to manage time-consuming requests. Create a small pane on bottom of the page and displays info on requests that would take a long time on the server, keeping your page and the user free to go somewhere else on the website. After the request is over and everything is right you have the option to download the data received as a file, or take any other action using angularjs promises.

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
  1. [validateActivities](#validateactivities)
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

#### validateActivities

The goal here is to preserve the identity of each user that creates an activity. Having that in mind we generate a MD5 hash of the user's login and store it alongside with the file itself. But you need to tell us the user credentials to validade, passing an object with the current user's login to validate.

```javascript
activitiesService.validateActivities(userIdentity);
```

It will be returned only the activities that have a match between the current user login hash and the saved MD5 hash.

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
