MettleDataGrid
===================

MettleDataGrid is a sophisticated, easy to extend, fully featured jQuery based data grid control.

### Features
&#10004; Dynamic data loading <br/>
&#10004; Virtual scrolling <br/>
&#10004; Dynamic data grouping <br/>
&#10004; Data filtering <br/>
&#10004; Column sorting, re-ordering, re-sizing <br/>
&#10004; State persistence <br/>
&#10004; Easy to skin/theme (purely CSS driven) <br/>
&#10004; Easy extension with custom filter, cell renderer, sorting <br/>
&#10004; Tablet support (iOS/Android) <br/>
&#10004; Easy data mock - enable faster development and testing <br/>
&#10004; JSON based interface <br/>

### Introduction
The grid provides all the above features. The components is under the folder `mettledatagrid-component`. There are various sample code as shown in example section below in folder `mettledatagrid-sample`. The component depends on `jQuery` and can be easily extended to add new features as required. <br/>

The grid can be extended via three ways `filter`, `renderer` or `plugin`. Example of each is provided below. `filter` and `renderer` defined by you needs to be referenced in response data as shown in fakeDataSets in the sample.

Below are some of the files to reference for example: <br/>
[Custom Filter](http://github.com/manishshanker/MettleDataGrid/blob/master/mettledatagrid-sample/lib/js/app/gridExtensions/mettleDataGrid.filter.DATE.js) <br/>
[Custom Renderer](http://github.com/manishshanker/MettleDataGrid/blob/master/mettledatagrid-component/src/lib/js/app/extensions/mettleDataGrid.renderer.DATE.js) <br/>
[Custom Plug-in](http://github.com/manishshanker/MettleDataGrid/blob/master/mettledatagrid-component/src/lib/js/app/extensions/mettleDataGrid.plugin.LABEL_BUTTON.js) <br/>
[Fake Data Source](http://github.com/manishshanker/MettleDataGrid/blob/master/mettledatagrid-sample/lib/js/app/gridDataSource/mettleDataGrid.FakeLocalSource.js) <br/>
[Fake Data Source Data-set](http://github.com/manishshanker/MettleDataGrid/blob/master/mettledatagrid-sample/lib/js/app/gridDataSource/fakeDataSet/mettleDataGrid.fakeDataSet1.js) <br/>
[Remote Data Source](http://github.com/manishshanker/MettleDataGrid/blob/master/mettledatagrid-sample/lib/js/app/gridDataSource/mettleDataGrid.MyRemoteSource.js) <br/>

### Browser support
&#10004; IE8+ <br/>
&#10004; FireFox  <br/>
&#10004; Chrome <br/>
&#10004; Safari <br/>
&#10004; Opera <br/>
&#10004; iOS Safari <br/>
&#10004; Android Chrome <br/>

### Grid Examples
1. [Basic](http://rawgithub.com/manishshanker/MettleDataGrid/master/mettledatagrid-sample/grid1.html)
2. [Grouping, custom extension, filters](http://rawgithub.com/manishshanker/MettleDataGrid/master/mettledatagrid-sample/grid2.html)
3. [Multiple themes and instances](http://rawgithub.com/manishshanker/MettleDataGrid/master/mettledatagrid-sample/grid3.html)
4. [Mock real-time updates](http://rawgithub.com/manishshanker/MettleDataGrid/master/mettledatagrid-sample/grid4.html)
5. [Real-time update using FireBase](http://rawgithub.com/manishshanker/MettleDataGrid/master/mettledatagrid-sample/grid5.html)

### License

Copyright 2011-2014 Manish Shanker

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.