angular.module('rruleRecurringSelect', ["ui.bootstrap.datetimepicker", "fng.uiBootstrapDateTime",]).directive('rruleRecurringSelect', [function() {
  return {
    restrict: 'E',
    scope: {
      rule: "=",
      okClick: "=",
      cancelClick: "=",
      showButtons: "="
    },
    templateUrl: 'template/rrule_recurring_select.html',
    link: function(scope, elem, attrs) {

      var MS_IN_DAY = 1000 * 60 * 60 * 24;

      scope.init = function() {
        scope.showStart = typeof attrs['showStart'] !== "undefined";
        scope.dispStart = attrs['dispStart'];
        scope.showEnd = typeof attrs['showEnd'] !== "undefined";
        scope.compact = typeof attrs['compact'] !== "undefined";
        scope.simplifiedDaily = typeof attrs['simplifiedDaily'] !== "undefined";
        scope.noHourly = typeof attrs['noHourly'] !== "undefined";
        scope.initFrequencies();
        scope.initWeekOrdinals();
        scope.selectedMonthFrequency = 'day_of_month';
        scope.hideActions = typeof attrs['hideActions'] !== 'undefined';
        scope.resetData();
        scope.$watch(scope.currentRule, scope.ruleChanged);
        scope.dateOptions = {};
        var minUntil = attrs['minUntil'];
        if (minUntil) {
          scope.dateOptions.minDate = new Date(parseInt(minUntil));
        }
        if(!_.isEmpty(scope.rule)) {
          scope.parseRule(scope.rule);
        }
        else
          scope.calculateRRule();
      };

      scope.initFrequencies = function() {
        scope.frequencies = [];
        if (!scope.noHourly) {
          scope.frequencies.push({name: 'Hourly', rruleType: RRule.HOURLY, type: 'hour'})
        }
        scope.selectedFrequency = { name: 'Daily', rruleType: RRule.DAILY, type: 'day' };
        scope.frequencies.push(
            scope.selectedFrequency,
            { name: 'Weekly', rruleType: RRule.WEEKLY, type: 'week' },
            { name: 'Monthly', rruleType: RRule.MONTHLY, type: 'month' },
            { name: 'Yearly', rruleType: RRule.YEARLY, type: 'year' });
      };

      scope.initMonthlyDays = function() {
        scope.monthDays = [];
        scope.yearMonthDays = [];

        _.times(31, function(index) {
          var day = { day: index + 1, value: index + 1, selected: false };
          scope.monthDays.push(day);
          scope.yearMonthDays.push(day);
        });
        var lastDay = { day: 'Last Day', value: -1, selected: false };
        scope.monthDays.push(lastDay);
        scope.yearMonthDays.push(lastDay);
      };

      scope.initWeekOrdinals = function() {
        scope.weekOrdinals = ['st', 'nd', 'rd', 'th'];
      };

      scope.initMonthlyWeeklyDays = function() {
        scope.monthWeeklyDays = [];

        _.times(4, function(index) {
          var days = _.map(scope.daysOfWeek(), function(dayOfWeek){
            dayOfWeek.value = dayOfWeek.value.nth(index + 1);
            return dayOfWeek;
          });
          scope.monthWeeklyDays.push(days);
        });
      };

      scope.resetData = function() {
        var hoursFunc = attrs['hoursFunc'] || 'hoursOfDay';
        scope.weekStart = attrs['weekStartDay'] || 'SU';
        scope.hours = scope[hoursFunc]();
        scope.defaultUntil = attrs['defaultUntil'];
        scope.weekDays = scope.daysOfWeek();
        scope.initMonthlyDays();
        scope.initMonthlyWeeklyDays();
        scope.initYearlyMonths();
        scope.selectedYearMonth = 1;
        scope.selectedYearMonthDay = 1;
        scope.interval = '';
      };

      scope.daysOfWeek = function() {
        var weekDays = ['SU','MO','TU','WE','TH','FR','SA'];
        var retVal = [];
        var startPos = weekDays.indexOf(scope.weekStart);
        for (var i=startPos; i<7;i++) {
          retVal.push({ name:weekDays[i].slice(0,1), value: RRule[weekDays[i]], selected:false});
        }
        for (i=0; i < startPos; i++) {
          retVal.push({ name:weekDays[i].slice(0,1), value: RRule[weekDays[i]], selected:false});
        }
        return retVal;
      };

      scope.hoursOfDay = function() {
        var hoursArray = [];
        for (var i = 0; i < 24 ; i++) {
          hoursArray.push({value:i, name: i.toString(), selected:false});
        }
        return hoursArray;
      };

      scope.medSlots = function() {
        var hoursArray;
        if (typeof scope.$parent.personMedsSlots === "function") {
          hoursArray = scope.$parent.personMedsSlots();
        } else {
          // use the notional four per day
          for (var i = 0 ; i < MedsSessions.length ; i++) {
            var slot = MedsSessions[i];
            hoursArray.push({value: slot.value, name: slot.name, selected: false})
          }
        }
        return hoursArray;
      };

      scope.initYearlyMonths = function() {
        scope.yearMonths = [
          { name: 'Jan', value: 1, selected: false },
          { name: 'Feb', value: 2, selected: false },
          { name: 'Mar', value: 3, selected: false },
          { name: 'Apr', value: 4, selected: false },
          { name: 'May', value: 5, selected: false },
          { name: 'Jun', value: 6, selected: false },
          { name: 'Jul', value: 7, selected: false },
          { name: 'Aug', value: 8, selected: false },
          { name: 'Sep', value: 9, selected: false },
          { name: 'Oct', value: 10, selected: false },
          { name: 'Nov', value: 11, selected: false },
          { name: 'Dec', value: 12, selected: false }
        ];
      };

      scope.selectMonthFrequency = function(monthFrequency) {
        scope.selectedMonthFrequency = monthFrequency;
        scope.resetData();
        scope.calculateRRule();
      };

      scope.toggleSelected = function(day) {
        day.selected = !day.selected;
        scope.calculateRRule();
      };

      scope.setRecurUntil = function() {
        if (!scope.recurEnd.until) {
          var defaultRecurEndBase;
          if (scope.defaultUntil) {
            defaultRecurEndBase = parseInt(scope.defaultUntil);
          } else {
            // Go to the end of the current day
            defaultRecurEndBase = new Date().getTime() + (MS_IN_DAY * 60);
            var ms = defaultRecurEndBase % MS_IN_DAY;
            defaultRecurEndBase = defaultRecurEndBase - ms;
          }
          if (defaultRecurEndBase < scope.minUntil) {
            defaultRecurEndBase = scope.minUntil;
          }
          scope.recurEnd.until = new Date(defaultRecurEndBase);
        }
      };

      scope.freqChanged = function() {
        scope.resetData();
        scope.calculateRRule();
      };

      scope.calculateRRule = function(recurTypeChange) {

        switch (recurTypeChange) {
          case 'after' :
            delete scope.recurEnd.until;
            scope.recurEnd.count = scope.recurEnd.count || 1;
            break;
          case 'on' :
            delete scope.recurEnd.count;
            delete scope.recurrenceRule.options.count;
            scope.setRecurUntil();
            break;
        }

        var recurEndObj = {};
        if (scope.recurEnd) {
          switch (scope.recurEnd.type) {
            case 'never':
              break;
            case 'after' :
              if (scope.recurEnd.count) {
                recurEndObj.count = scope.recurEnd.count;
              }
              break;
            case 'on':
              if (scope.recurEnd.until) {
                recurEndObj.until = scope.recurEnd.until;
              }
              break;
            default:
              console.log('No support for recurEndType ' + scope.recurEnd.type);
          }
        }

        switch(scope.selectedFrequency.type) {
          case 'hour':
            scope.calculateHourlyRRule(recurEndObj);
            break;
          case 'day':
            scope.calculateDailyRRule(recurEndObj);
            break;
          case 'week':
            scope.calculateWeeklyRRule(recurEndObj);
            break;
          case 'month':
            scope.calculateMonthlyRRule(recurEndObj);
            break;
          case 'year':
            scope.calculateYearlyRRule(recurEndObj);
        }

        if(!_.isUndefined(scope.rule))
          scope.rule = scope.recurrenceRule.toString();
      };

      scope.calculateInterval = function() {
        var interval = parseInt(scope.interval);
        if (!interval)
          interval = 1;
        return interval;
      };

      scope.calculateHourlyRRule = function(recurEndObj) {
        scope.recurrenceRule = new RRule(angular.extend({
          freq: RRule.HOURLY,
          interval: scope.calculateInterval(),
          wkst: RRule[scope.weekStart]
        },recurEndObj));
      };

      scope.calculateDailyRRule = function(recurEndObj) {
        var ruleOptions = {
          freq: RRule.DAILY,
          interval: scope.calculateInterval(),
          wkst: RRule[scope.weekStart]
        };

        var selectedHours = _(scope.hours).filter(function(hour) {
          return hour.selected;
        }).map(function(v) { return v.value }).value();
        if (selectedHours.length > 0) {
          ruleOptions.byhour = selectedHours;
          ruleOptions.byminute = ruleOptions.bysecond = 0;
        }
        angular.extend(ruleOptions,recurEndObj);
        scope.recurrenceRule = new RRule(ruleOptions);
      };

      scope.calculateWeeklyRRule = function(recurEndObj) {
        var selectedDays = _(scope.weekDays).filter(function(day) {
          return day.selected;
        }).map(function(v) { return v.value }).value();

        scope.recurrenceRule = new RRule(angular.extend({
          freq: RRule.WEEKLY,
          interval: scope.calculateInterval(),
          wkst: RRule[scope.weekStart],
          byweekday: selectedDays
        },recurEndObj));
      };

      scope.calculateMonthlyRRule = function(recurEndObj) {
        if(scope.selectedMonthFrequency == 'day_of_month')
          scope.calculateDayOfMonthRRule(recurEndObj);
        else
          scope.calculateDayOfWeekRRule(recurEndObj);
      };

      scope.calculateDayOfMonthRRule = function(recurEndObj) {
        var selectedDays = _(scope.monthDays).filter(function(day) {
          return day.selected;
        }).map(function(v) { return v.value }).value();

        scope.recurrenceRule = new RRule(angular.extend({
          freq: RRule.MONTHLY,
          interval: scope.calculateInterval(),
          wkst: RRule[scope.weekStart],
          bymonthday: selectedDays
        },recurEndObj));
      };

      scope.calculateDayOfWeekRRule = function(recurEndObj) {
        var selectedDays = _(scope.monthWeeklyDays).flatten().filter(function(day) {
          return day.selected;
        }).map(function(v) { return v.value }).value();

        scope.recurrenceRule = new RRule(angular.extend({
          freq: RRule.MONTHLY,
          interval: scope.calculateInterval(),
          wkst: RRule[scope.weekStart],
          byweekday: selectedDays
        }, recurEndObj));
      };

      scope.calculateYearlyRRule = function(recurEndObj) {
        var selectedMonths = _(scope.yearMonths).flatten().sortBy(function(month){
          return month.value;
        }).filter(function(month) {
          return month.selected;
        }).map(function(v) { return v.value }).value();

        var selectedDays = _(scope.yearMonthDays).flatten().sortBy(function(day){
          return day.value;
        }).filter(function(day) {
          return day.selected;
        }).map(function(v) { return v.value }).value();

        scope.recurrenceRule = new RRule(angular.extend({
          freq: RRule.YEARLY,
          interval: scope.calculateInterval(),
          bymonth: selectedMonths,
          bymonthday: selectedDays
        },recurEndObj));
      };

      scope.parseRule = function(rRuleString) {
        scope.recurrenceRule = RRule.fromString(rRuleString);

        scope.interval = scope.recurrenceRule.options.interval;

        scope.selectedFrequency = _.filter(scope.frequencies, function(frequency) {
          return frequency.rruleType == scope.recurrenceRule.options.freq;
        })[0];

        switch(scope.selectedFrequency.type) {
          case 'day':
            scope.initFromDailyRule();
            break;
          case 'week':
            scope.initFromWeeklyRule();
            break;
          case 'month':
            scope.initFromMonthlyRule();
            break;
        }

       scope.initFromRecurEndRule();
      };

      scope.initFromRecurEndRule = function() {
        scope.recurEnd = {};
        scope.setRecurUntil();
        if (scope.recurrenceRule.options.until) {
          scope.recurEnd.type = 'on';
          // Handle use of timezones in RRule
          if (scope.recurrenceRule.options.until._moment) {
            scope.recurEnd.until = scope.recurrenceRule.options.until._moment.toDate();
          } else {
            scope.recurEnd.until = scope.recurrenceRule.options.until;
          }
        } else if (scope.recurrenceRule.options.count) {
          scope.recurEnd.type = 'after';
          scope.recurEnd.count = scope.recurrenceRule.options.count;
        } else {
          scope.recurEnd.type = 'never';
        }
      };

      scope.initFromDailyRule = function() {
        var ruleSelectedHours = scope.recurrenceRule.options.byhour;

        _.each(scope.hours, function(hour) {
          hour.selected = (_.includes(ruleSelectedHours, hour.value));
        });
      };

      scope.initFromWeeklyRule = function() {
        var ruleSelectedDays = scope.recurrenceRule.options.byweekday;

        _.each(scope.weekDays, function(weekDay) {
          weekDay.selected = (_.includes(ruleSelectedDays, weekDay.value.weekday));
        });
      };

      scope.initFromMonthlyRule = function() {
        if(!_.isEmpty(scope.recurrenceRule.options.bymonthday) || !_.isEmpty(scope.recurrenceRule.options.bynmonthday))
          scope.initFromMonthDays();
        else if(!_.isEmpty(scope.recurrenceRule.options.bynweekday))
          scope.initFromMonthWeekDays();
      };

      scope.initFromMonthDays = function() {
        var ruleMonthDays = scope.recurrenceRule.options.bymonthday;
        scope.selectedMonthFrequency = 'day_of_month';

        _.each(scope.monthDays, function(weekDay) {
          weekDay.selected = (_.includes(ruleMonthDays, weekDay.value));
        });

        if(scope.recurrenceRule.options.bynmonthday.length > 0 && scope.recurrenceRule.options.bynmonthday[0] == -1)
          scope.monthDays[31].selected = true;
      };

      scope.initFromMonthWeekDays = function() {
        var ruleWeekMonthDays = scope.recurrenceRule.options.bynweekday;
        scope.selectedMonthFrequency = 'day_of_week';

        _.each(ruleWeekMonthDays, function(ruleArray) {
          var dayIndex = ruleArray[0];
          var weekIndex = ruleArray[1] - 1;

          var week = scope.monthWeeklyDays[weekIndex];
          _.each(week, function(day) {
            if (day.value.weekday == dayIndex) {
              day.selected = true;
              return;
            }
          });
        });
      };

      scope.untilDateOptions = {
          "showWeeks": false
      };

      scope.ruleChanged = function() {
        if (!_.isEmpty(scope.rule)) {
          scope.parseRule(scope.rule);
        }
      };

      scope.currentRule = function() {
        return scope.rule;
      };

      scope.init();
    }
  }
}]);

angular.module('rrule.templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('template/rrule_recurring_select.html','<div class="rrule-recurring-select">\n  <h3 ng-hide="compact">Repeat</h3>\n\n  <div class="frequency-controls">\n    <div class="frequency-type">\n      <span ng-show="dispStart">From {{ dispStart | date:\'dd/MM/yy\'}}. </span><span ng-show="compact">Repeat </span><select ng-model="selectedFrequency" ng-options="frequency as frequency.name for frequency in frequencies" ng-change="freqChanged()" required>\n      </select>\n    </div>\n\n    <div class="interval">\n      Every <input type="text" ng-model="interval" ng-change="calculateRRule()" /> {{selectedFrequency.type}}(s):\n    </div>\n  </div>\n\n  <div class="daily rrs-toggle" ng-if="selectedFrequency.type == \'day\' && !simplifiedDaily">\n    <ul>\n      <li ng-repeat="hour in hours" ng-click="toggleSelected(hour)" ng-class="{ selected: hour.selected }">\n        {{hour.name}}\n      </li>\n    </ul>\n  </div>\n\n  <div class="weekly rrs-toggle" ng-if="selectedFrequency.type == \'week\'">\n    <ul>\n      <li ng-repeat="day in weekDays" ng-click="toggleSelected(day)" ng-class="{ selected: day.selected }">\n        {{day.name}}\n      </li>\n    </ul>\n  </div>\n\n  <div class="monthly {{selectedMonthFrequency}}" ng-if="selectedFrequency.type == \'month\'">\n    <input type="radio" ng-model="selectedMonthFrequency" ng-click="selectMonthFrequency(\'day_of_month\')" value="day_of_month"/>Day of month\n    <input type="radio" ng-model="selectedMonthFrequency" ng-click="selectMonthFrequency(\'day_of_week\')" value="day_of_week"/>Day of week\n\n    <ul class="month-days">\n      <li ng-repeat="day in monthDays" ng-click="toggleSelected(day)" ng-class="{ selected: day.selected }" ng-if="selectedMonthFrequency == \'day_of_month\'">\n        {{day.day}}\n      </li>\n    </ul>\n\n    <ul class="month-week-days">\n      <li ng-repeat="week in monthWeeklyDays" ng-if="selectedMonthFrequency == \'day_of_week\'">\n        <ul class="week-days">\n          <li class="week-index-title">{{$index + 1}}{{weekOrdinals[$index]}}</li>\n          <li ng-repeat="day in week" ng-click="toggleSelected(day)" ng-class="{ selected: day.selected }">\n            {{ day.name }}\n          </li>\n        </ul>\n      </li>\n    </ul>\n  </div>\n\n  <div class="yearly" ng-if="selectedFrequency.type == \'year\'">\n    <label for="yearMonth">Months: </label>\n    <ul class=\'year-months\'>\n      <li ng-repeat="yearMonth in yearMonths" class="year-month">\n        <input type="checkbox" value="yearMonth.value" ng-checked="yearMonth.selected" ng-click="toggleSelected(yearMonth)" id="year-month-{{yearMonth.value}}">\n        <label for="year-month-{{yearMonth.value}}">{{ yearMonth.name }}</label>\n      </li>\n    </ul>\n    <!-- <select name="yearMonth" ng-model="selectedYearMonth" ng-options="yearMonth as yearMonth.name for yearMonth in yearMonths track by yearMonth.value" ng-change="calculateRRule()" required></select> -->\n    <br />\n    <label for="yearMonthDay">Day of Month: </label>\n     <ul class=\'year-month-days\'>\n      <li ng-repeat="monthDay in yearMonthDays" class="year-month-day">\n        <input type="checkbox" value="monthDay.value" ng-checked="monthDay.selected" ng-click="toggleSelected(monthDay)" id="year-month-day-{{monthDay.value}}">\n        <label for="year-month-day-{{monthDay.value}}">{{ monthDay.day }}</label>\n      </li>\n    </ul>\n  </div>\n\n  <div class="recurStarts" ng-if="showStart">\n    <div>\n      <label>Starts on</label>\n    </div>\n    <div>\n      <input ng-model="recurrenceRule.options.dtstart" ui-date ui-date-format datepicker-popup-fix>\n    </div>\n  </div>\n\n  <div class="recurEnd" ng-if="showEnd">\n    <div class="recurEndOptions">\n        <div class="recurEndsLabel">\n          <label>Ends</label>\n        </div>\n        <div class="recurEndsOpts">\n          <div><label><input id="re-never" type="radio" ng-model="recurEnd.type" ng-change="calculateRRule(\'never\')" value="never"> Never</label></div>\n          <div>\n            <label><input id="re-count" type="radio" ng-model="recurEnd.type" ng-change="calculateRRule(\'after\')" value="after"> After</label>\n            <input type="number" ng-model="recurEnd.count" class="recurCount" ng-change="calculateRRule()" ng-disabled="recurEnd.type !== \'after\'" min="1"> occurrences\n          </div>\n          <div>\n            <label><input id="re-until" type="radio" ng-model="recurEnd.type" ng-change="calculateRRule(\'on\')" value="on"> On</label>\n            <datetimepicker ng-show="recurEnd.type === \'on\'" ng-model="recurEnd.until" class="recurUntilDate re-input" show-meridian="false" date-format="dd/MM/yyyy" date-options="untilDateOptions" show-button-bar="false" ng-change="calculateRRule()"></datetimepicker>\n            <datetimepicker ng-hide="recurEnd.type === \'on\'" ng-model="fake.until"     class="recurUntilDate re-dummy" show-meridian="false" date-format=" "          date-options="untilDateOptions" disabled-date="true" readonly-date="true" readonly-time="true" disabled></datetimepicker>\n          </div>\n        </div>\n    </div>\n  </div>\n  <!--<pre>{{ recurrenceRule }}-->\n    <!--{{ weekDays | json }}-->\n  <!--</pre>-->\n  <div ng-if="!hideActions" class="actions">\n    <hr />\n\n    <div class="summary">\n      Summary: {{selectedFrequency.name}}\n      <div class="description">\n        {{ recurrenceRule.toText() }}\n      </div>\n    </div>\n\n    <div class="button ok" ng-if="showButtons" ng-click="okClick()">Ok</div>\n    <div class="button cancel" ng-if="showButtons" ng-click="cancelClick()">Cancel</div>\n  </div>\n</div>\n');}]);