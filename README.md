# russound-rio
[![npm](https://img.shields.io/npm/dt/russound-rio.svg)](https://www.npmjs.com/package/russound-rio)
[![npm](https://img.shields.io/npm/l/russound-rio.svg)](https://www.npmjs.com/package/russound-rio)

[![NPM Version](https://img.shields.io/npm/v/russound-rio.svg)](https://www.npmjs.com/package/russound-rio)

Javascript socket library for Russound RIO

# Description

Javascript library that allows you to connect and controll your Russound RIO MCA devices.

This library was primarily developed to be used within a Homebridge environment but may used by itself, see demo
folder for example of how to connect and interact with device   

# Changelog
* Version 0.1.0 Added Zone and Source Name mapping and config.
* Version 0.0.6 refactored and cleaned up some code.
* Version 0.0.3 altered to support Homebridge, with https://github.com/michaelpettorosso/homebridge-russound-rio.
* Version 0.0.2 added demo project.
* Initial Release.

# To Do

Only supports one controller at the moment

# Installation

As a prerequisite ensure that the Russound device is controllable using the Russound iOS app.
You also need to have [git](https://github.com/git/git) installed.

1. Install russound using: npm install russound.rio
3. Update your configuration file. See the sample below.

# Configuration

Example config :
```js
{
   "rio":{
      "name":"Russound",
      "controllers":[
         {
            "name":"MCA XXX",
            "ip":"your.russound.ip",
            "zones":[
               {
                  "name":"Zone1",
                  "display_name":"Zone 1",
                  "sources":[
                     "Source1",
                     "Source2",
                     "Source3",
                     "Source4",
                     "Source5",
                     "Source6"
                  ]
               },
               {
                  "name":"Zone2",
                  "display_name":"Zone 2",
                  "sources":[
                     "Source1",
                     "Source2",
                     "Source3",
                     "Source4",
                     "Source5",
                     "Source6"
                  ]
               },
               {
                  "name":"Zone3",
                  "display_name":"Zone 3",
                  "sources":[
                     "Source1",
                     "Source2",
                     "Source3",
                     "Source4",
                     "Source5",
                     "Source6"
                  ],
                  "enable":false
               },
               {
                  "name":"Zone4",
                  "display_name":"Zone 4",
                  "sources":[
                     "Source1",
                     "Source2",
                     "Source3",
                     "Source4",
                     "Source5",
                     "Source6"
                  ]
               },
               {
                  "name":"Zone5",
                  "display_name":"Zone 5",
                  "sources":[
                     "Source1",
                     "Source2",
                     "Source3",
                     "Source4",
                     "Source5",
                     "Source6"
                  ]
               },
               {
                  "name":"Zone6",
                  "display_name":"Zone 6",
                  "sources":[
                     "Source1",
                     "Source2",
                     "Source3",
                     "Source4",
                     "Source5",
                     "Source6"
                  ]
               }
            ],
            "sources":[
               {
                  "name":"Source1",
                  "display_name":"Source 1"
               },
               {
                  "name":"Source2",
                  "display_name":"Source 2"
               },
               {
                  "name":"Source3",
                  "display_name":"Source 3"
               },
               {
                  "name":"Source4",
                  "display_name":"Source 4"
               },
               {
                  "name":"Source5",
                  "display_name":"Source 5"
               },
               {
                  "name":"Source6",
                  "display_name":"Source 6"
               }
            ]
         }
      ]
   }
}

```

### Config Explanation:
The names Zone1, Zone2, Zone3, Zone4, Zone5 and Zone6 should match the Zone names given in the Russound Controller configuration (the names in the Russound App)

The names Source1, Source2, Source3, Source4, Source5 and Source6 should match the Source names given in the Russound Controller configuration (the names in the Russound App)
  
  Any non configured sources identified as 'N/A' will be ignored

With this configuration you can define which sources are attached to which zones, the Russound API doesn't identify the configuration correctly.
That is, if different sources are selected for different zones in the Russound Controller configuration there is no way to determine this through the API. 
The Russound App doesn't handle this, I've added the capability to manage 

###

| Fields                 | Description                                                        | Default                                                                   | Required |
|------------------------|--------------------------------------------------------------------|---------------------------------------------------------------------------|----------|
| name                   | Name to use for the Russound platform.                             |                                                                           | No       |
`controllers` configuration parameters:

| Fields                 | Description                                                        | Default                                                                   | Required |
|------------------------|--------------------------------------------------------------------|---------------------------------------------------------------------------|----------|
| name                   | Name to use for this Russound Controller.                          | MCA-88X                                                                   | No       |
| ip                     | IP address of your Russound Controller.                            |                                                                           | Yes      |

`zones` zones parameters:
| Fields                 | Description                                                        | Default                                                                   | Required |
|------------------------|--------------------------------------------------------------------|---------------------------------------------------------------------------|----------|
| name                   | Name to of this zone configured on the Russound Controller.        |                                                                           | Yes      |
| display_name           | Name that you want the zone to display.                            | if blank it is name                                                       | No       |
| sources                | List of sources to add to zone.                                    |                                                                           | No       |
| enable                 | Hides zone from Homekit                                            | true                                                                      | No       |

`sources` sources parameters:
| Fields                 | Description                                                        | Default                                                                   | Required |
|------------------------|--------------------------------------------------------------------|---------------------------------------------------------------------------|----------|
| name                   | Name to of this source configured on the Russound Controller.      |                                                                           | Yes      |
| display_name           | Name that you want the source name to display                      | if blank it is name                                                       | No       |

# Troubleshooting

