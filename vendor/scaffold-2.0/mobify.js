require(["mobifyjs/capture", "mobifyjs/resizeImages", "src/dust-templates"], function(Capture, ResizeImages, Templates) {
    var Mobify = window.Mobify = window.Mobify || {};
    
    var capturing = window.Mobify && window.Mobify.capturing || false;
    if (capturing) {
        // Grab reference to a newly created document
        var capture = Capture.init(function(capture){
            var capturedDoc = capture.capturedDoc;
            // Resize images using Mobify Image Resizer
            // ResizeImages.resize(capturedDoc, 320);
            // Render source DOM to document
            dust.render("src/tmpl/home", {}, function(err, out){
                capture.render(out);
            });
        });
    }

}, undefined, true);
// relPath, forceSync
