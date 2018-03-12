;(function (win, doc) {
    "use strict";

    function precisionRound(s, p) {
        var f = Math.pow(10, p);
        return Math.round(s * f) / f;
    }

    function easeOut(t, ein) {
        return 1 - ein(1 - t);
    }

    function easeInOut(t, ein) {
        if (t < .5) return ein(t * 2) / 2;
        return 1 - ein((1 - t) * 2) / 2;
    }

    var _ease = function () {};

    _ease.quadIn = function (t) { return Math.pow(t, 2); };
    _ease.quadOut = function (t) { return easeOut(t, _ease.quadIn); };
    _ease.quadInOut = function (t) { return easeInOut(t, _ease.quadIn); };
    _ease.cubicIn = function (t) { return Math.pow(t, 3); };
    _ease.cubicOut = function (t) { return easeOut(t, _ease.cubicIn); };
    _ease.cubicInOut = function (t) { return easeInOut(t, _ease.cubicIn); };
    _ease.quartIn = function (t) { return Math.pow(t, 4); };
    _ease.quartOut = function (t) { return easeOut(t, _ease.quartIn); };
    _ease.quartInOut = function (t) { return easeInOut(t, _ease.quartIn); };
    _ease.quintIn = function (t) { return Math.pow(t, 5); };
    _ease.quintOut = function (t) { return easeOut(t, _ease.quintIn); };
    _ease.quintInOut = function (t) { return easeInOut(t, _ease.quintIn); };
    _ease.sineIn = function (t) { return 1 - precisionRound(Math.cos(Math.PI / 2 * t), 6); };
    _ease.sineOut = function (t) { return easeOut(t, _ease.sineIn); };
    _ease.sineInOut = function (t) { return easeInOut(t, _ease.sineIn); };
    _ease.expoIn = function (t) { return precisionRound((Math.pow(Math.E, 10 * t) - 1) / (Math.pow(Math.E, 10) - 1), 6); };
    _ease.expoOut = function (t) { return easeOut(t, _ease.expoIn); };
    _ease.expoInOut = function (t) { return easeInOut(t, _ease.expoIn); };
    _ease.circIn = function (t) { return 1 - precisionRound(Math.sqrt(1 - t * t), 6); };
    _ease.circOut = function (t) { return easeOut(t, _ease.circIn); };
    _ease.circInOut = function (t) { return easeInOut(t, _ease.circIn); };
    _ease.elasticIn = function (t) {
        if (t == 0) return 0;
        return precisionRound((.04 - .04 / t) * Math.sin(25 * t) + 1, 6);
    };
    _ease.elasticOut = function (t) { return easeOut(t, _ease.elasticIn); }
    _ease.elasticInOut = function (t) { return easeInOut(t, _ease.elasticIn); };
    _ease.backIn = function (t) {
        var s = 1.70158;
        var p = precisionRound(t * t * ((s + 1) * t - s), 6);
        return p;
    };
    _ease.backOut = function (t) { return easeOut(t, _ease.backIn); };
    _ease.backInOut = function (t) { return easeInOut(t, _ease.backIn); };
    _ease.bounceIn = function (t) { return 1 - _ease.bounceOut(1 - t); };
    _ease.bounceOut = function (t) {
        var a = 4 / 11;
        var b = 8 / 11;
        var c = 9 / 10;
        var ca = 4356 / 361;
        var cb = 35442 / 1805;
        var cc = 16061 / 1805;

        var t2 = t * t;

        return t < a ? 7.5625 * t2 :
            t < b ? 9.075 * t2 + 3.4 :
            t < c ? ca * t2  - cb * t + cc :
            10.8 * t2 - 20.52 * t +  10.72;
    };
    _ease.bounceInOut = function (t) { return easeInOut(t, _ease.bounceIn); };

    win.Ease = _ease;

})(window, document);
