# Cache Visualiser

Cache headers can be confusing, or unintuitive.
This app un-obfuscates the information that your CDN is sending back!

# TODOs

* Include chartjs, bootstrap, or tailwind.css.
* Add in authentication in order to use the app e.g. sign in with google, github etc.
* Add in test cases:
	- A test for each CDN (and one that has no CDN) to check the display is working correctly for each.
* Cache status counter seems to be not working for any CDN except Fastly.
* Hits counter seems to be not working for any CDN except Fastly.
* The text showing the number of hits for each cache node is hard to read because the colour is not very contrasted to the background.
* The layout looks a bit big, perhaps it could be more compact. I am not a design expert however.
* Add in some protection from abuse of the app. This should be both front end detection and detection in the compute app itself. Things like not allowing requests that loop, timeouts for requests that take too long, etc.

# DONEs

* Initial build that accepts http headers pasted in by the user.
* Show whether it was a hit or not, and the number of hits, and time taken.
* A diagram to see the journey of the request from the user through the cdn and to the origin.
* Connect each of the items shown in the request journey diagram.
* Add in the origin to the viewer's right of the request flow diagram. At least for Fastly, it is possible to determine the difference between when the request was sent to the origin, and when it was received back to Varnish.
* CDN detection seems to be not working.
* Change the mechanism for passing data around to make nicer code (or maybe use an existing reporting framework/library).
* Put a little arrow to the left of the protocol box to indicate there are choices for the https/http box.
* Reduce the spacing of elements and make it a bit more compact.
