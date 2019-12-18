
function hls_play(page, video, url) {
    if (Hls.isSupported()) {
        var config = {
            xhrSetup: function(xhr, url) {
                xhr.setRequestHeader("X-USER", settings.user());
            }
        };
        var player=new Hls(config);
        player.loadSource(url);
        player.attachMedia(video[0]);
        player.on(Hls.Events.MANIFEST_PARSED,function () {
            video[0].play();
        });
    } else if (video[0].canPlayType('application/vnd.apple.mpegurl')) {
        video[0].src= url;
        video[0].addEventListener('canplay', function() {
            video[0].play();
        });
    }

    page.unbind(":close").on(":close", function (e) {
        video[0].src='';
        if (typeof(video[0].pause)==='function') video[0].pause();
    });
}

function dash_play(page, video, url) {
    var player=dashjs.MediaPlayer().create();
    player.extend("RequestModifier", function () {
        return {
            modifyRequestHeader: function (xhr) {
                xhr.setRequestHeader("X-USER",settings.user());
                return xhr;
            },
            modifyRequestURL: function (url) {
                return url;
            }
        };
    },true);

    player.initialize();
    player.attachView(video[0]);
    player.attachSource(url);

    page.unbind(":close").on(":close", function (e) {
        player.attachSource(null);
    });
}

function shaka_play(page, video, url) {
    var onError=function (e) {
        console.log(e);
    };

    var player=new shaka.Player(video[0])
    player.addEventListener('error', function (e) {
        onError(e.detail);
    });

    player.getNetworkingEngine().registerRequestFilter(function (type,request) {
        request.headers["X-USER"]=settings.user();
    });

    player.load(url).then(function () {
        console.log("Video loaded");
    }).catch(onError);

    page.unbind(":close").on(":close", function (e) {
    });
}

$("#player").on(":initpage", function (e) {
    shaka.polyfill.installAll();
}).on(":play", function (e, url) {
    var page=$(this);
    var video=page.find("video");

    page.trigger(":close");
    if (url.endsWith(".m3u8") || url.endsWith(".M3U8")) {
        hls_play(page, video, url);
    }
    if (url.endsWith(".mpd") || url.endsWith(".MPD")) {
        shaka_play(page, video, url);
    }
}).on(":update", function (e) {
    var plist=$(this).find("[play-list]");
    plist.empty();
    apiHost.playList(settings.user()).then(function (data) {
        $.each(data, function (k,v) {
            var line=$('<tr><td><a href="javascript:void(0)"><img src="'+v.img+'" alt="'+v.name+'"/><figcaption>'+v.name+'</figcaption></a></td></tr>');
            line.find("a").click(function () {
                var e = $.Event("keydown", { keyCode: 13 });
                $("#player input").val(v.url).trigger(e);
            });
            plist.append(line);
        });
        if (spec("benchmark")) {
            var streams=$.grep(plist.find('a'),function (e, i) {
                return $(e).find("img").attr("alt").startsWith("hls");
            });
            streams[spec("seq")%streams.length].click();
            $("[video-section]").css({width:"100vw",height:"100vh"});
        }
    });
}).find("input").keydown(function (e) {
    if (e.keyCode!=13) return;
    $("#player").trigger(":close").trigger(":play", [$(this).val()]);
});

$("#player video").click(function (e) {
    var rect=e.target.getBoundingClientRect();
    var x=(e.clientX-rect.left)/rect.width;
    var y=(e.clientY-rect.top)/rect.height;
    var stream=$("#player input").val();
    apiHost.click(settings.user(), x, y, this.currentTime, stream).then(function (url) {
        if (url) window.open(url,'_blank');
    });
});
