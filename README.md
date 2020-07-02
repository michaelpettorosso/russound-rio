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

* Version 0.0.3 altered to support Homebridge, with https://github.com/michaelpettorosso/homebridge-russound-rio.
* Version 0.0.2 added demo project.
* Initial Release.

# To Do

Only supports one controller at the momnet

# Installation

As a prerequisite ensure that the Russound device is controllable using the Russound iOS app.
You also need to have [git](https://github.com/git/git) installed.

1. Install russound using: npm install russound.rio
3. Update your configuration file. See the sample below.

# Configuration

Example config :
 ```
{
  "rio": {
    "mca-series": true,
    "name": "Russound",
    "controllers": [
      {
        "name": "MCA-88X",
        "controller": 1,
        "ip": "your.deviceip",
        "zones": 6,
        "sources": 6
      }
    ]
  }
}
 ```
### Config Explanation:

Field           			| Description
----------------------------|------------
**name**   			        | (optional) Defaults to "Russound".
**mca-series**              | (optional) Noy used at the moment.
Controller Attributes         |
----------------------------|------------
**name**					| (optional) Defaults to "Russound".
**ip**          			| (required) The internal ip address of your Russound.
**zones**              		| (optional) Defaults to 6.
**sources**					| (optional) Defaults to 6.
**controller**              | (optional) Defaults to 1 (Note: Only support for one controller at the moment).


# Troubleshooting

