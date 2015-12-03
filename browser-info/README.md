rc-browser-info
===============

Install
-------
```bash
$> npm install rc-browser-info --registry "http://deployer1:4873/"
```

Usage
-----
### BrowserInfo(*userAgent*)
* Constructor Parameters
    * (`String`) **userAgent**: A User-Agent `String` to parse.
* Properties
    * (`String`) **agent** [*read-only*]: The `userAgent` passed to the constructor.
    * (`Boolean`) **isMobile** [*read-only*]: Indicates if the device is a phone.
    * (`Boolean`) **isTablet** [*read-only*]: Indicates if the device is a tablet.
    * (`Boolean`) **isDesktop** [*read-only*]: Indicates if the device is a desktop/laptop.