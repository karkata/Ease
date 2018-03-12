;(function (win, doc) {
    // Function level strict mode syntax
    "use strict";

    var VERSION = "1.0.0";
    var NS_SVG = "http://www.w3.org/2000/svg";
    var NS_XLNK = "http://www.w3.org/1999/xlink";

    var E_NAME_ANI = ["animate", "animateColor", "animateMotion", "animateTransform", "mpath", "set"];
    var E_NAME_SHP = ["circle", "ellipse", "line", "path", "polygon", "polyline", "rect"];
    var E_NAME_TXT = ["altGlyph", "altGlyphDef", "altGlyphItem", "glyph", "glyphRef", "textPath", "text", "tref", "tspan"];
    var E_NAME_PTH = ["line", "path", "polyline", "polygon"];
    var E_NAME_CTN = ["a", "defs", "glyph", "g", "marker", "mask", "missing-glyph", "pattern", "svg", "switch", "symbol"];
    var E_NAME_GRP = ["circle",  "ellipse", "image", "line", "path", "polygon", "polyline", "rect", "text", "use"];

    /* Polyfill */

    if (!Array.isArray) {
        Array.isArray = function (arg) {
            return Object.prototype.toString.call(arg) === "[object Array]";
        };
    }

    /* Utility functions */

    function ISXLINK(source) { return (source && source.length > 6 && source.substring(0, 6) == "xlink:"); }

    function ISDEF() {
        if (arguments.length == 0) return false;
        for (var i = 0; i < arguments.length; i++) {
            if (typeof arguments[i] == "undefined") return false;
        }
        return true;
    }

    function REFINEID(id, use) {
        var sharp = (id && id.indexOf("#") == 0);
        if (sharp && use) return id;
        else if (sharp && !use) return id.substring(1);
        else if (!sharp && use) return "#" + id;
        else return id;
    }

    /**
     * src 객체의 속성을 dst 객체에 복사합니다. 
     */
    function CPP(dst, src, name) {
        if (dst && src && name) {
            dst[name] = src[name];
        }
    }

    function TRIM(str) {
        return str ? str.replace(/(^\s*)|(\s*$)/gi, "") : "";
    }

    function GETFNIRI(value) {
        if (!ISDEF(value)) throw new Error("[DV] value paramter is undefined.");
        if (value instanceof DVE) value = value.id();
        if (value.indexOf("url(#") == 0) return value;
        else return "url(" + REFINEID(value, true) + ")";
    }

    /**
     * Converts the points parameter to a string as <list-of-points> type.
     * @param {<list-of-points>|Array} value The points
     * @return The converted string as <list-of-points> type.
     */
    function CNVTLISTOFPOINTSTR(value) {
        if (ISDEF(value)) {
            if (typeof(value) === "string") return value;
            else if (Array.isArray(value)) return value.map(function (v, i, a) { return (Array.isArray(v) && v.length == 2) ? v.join(",") : ""; }).join(" ");
        }
        return undefined;
    }

    function CNVTLISTOFVALUESTR(value, delimeter) {
        if (ISDEF(value)) {
            if (typeof(value) === "string") return value;
            return Array.isArray(value) ? value.join(delimeter || " ") : value;
        }
        return undefined;
    }

    /**
     * Gets a computed size object of the specified target element.
     * @param {object} target the SVG element.
     * @return The computed size object.
     */
    function GETELMSIZE(target) {
        var s = getComputedStyle(target), size = { w: 0, h: 0 };
        if (s) {
            size.w = parseFloat(s.width) - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
            size.h = parseFloat(s.height) - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom);
        } else {
            console.log("[DV] It won't get a computed style from " + target);
        }
        return size;
    }

    /**
     * 가변 레이아웃을 정의하는 문자열을 파싱하여 키=값 객체로 반환합니다.
     * @param {string} layoutString 레이아웃 문자열
     * @return 키=값 객체
     */
    function PARSELAYOUT(layoutString) {
        var layout = {};
        if (!layoutString) return layout;
        var tokens = layoutString.split(/\s*;\s*/);
        for (var i = 0, len = tokens.length; i < len; i++) {
            var kv = tokens[i].split(/\s*:\s*/);
            if (kv.length == 2) layout[TRIM(kv[0])] = TRIM(kv[1]);
        }
        return layout;
    }

    /**
     * 주어진 수식을 계산한 값을 반환합니다.
     * @param {string} expr 수식 ex) 100%-25px
     * @param {number} p 100%의 기준이 되는 값
     * @param {object} g 키=값 형식의 콜렉션 객체로써 수식 내부에 있는 변수의 값을 가지고 있다.
     * @return 수식을 계산한 값을 반환한다. 수식을 인식 못하는 경우 수식을 그대로 반환한다.
     */
    function COMPUTEEXPR(expr, p, g) {
        var tokens = expr.toString().split(/([\+\-]+)/g);
        if (tokens.length == 0) return expr;
        var op = "+", num = 0, n = 0;
        for (var i = 0, len = tokens.length, c = ""; i < len; i++) {
            c = tokens[i];
            if (c == "+") {
                op = "+";
                continue;
            } else if (c == "-") {
                op = "-";
                continue;
            } else if (c.charAt(c.length - 1) == "%") {
                n = (p * parseFloat(c) / 100);
            } else if (c.charAt(0) == "{" && c.chartAt(c.length - 1) == "}") {
                n = g[c.substring(1, c.length - 1)];
            } else {
                n = parseFloat(c);
            }

            switch (op) {
                case "+": num += n; break;
                case "-": num -= n; break;
            }
        }

        return num;
    }

    /**
     * 주어진 수식을 계산한 값을 반환합니다.
     * COMPUTEEXPR과 달리 한 번 계산했던 속성식은 함수로캐싱되어 사용됩니다.
     * @param {object} dve 캐싱함수를 가져야 할 대상
     * @param {string} name 캐싱 함수 이름
     * @param {string} expr 수식 ex) 100%-25px
     * @param {number} p 100%의 기준이 되는 값
     * @param {object} g 키=값 형식의 콜렉션 객체로써 수식 내부에 있는 변수의 값을 가지고 있다.
     * @return 수식을 계산한 값을 반환한다. 수식을 인식 못하는 경우 수식을 그대로 반환한다.
     */
    function COMPUTEEXPRWITHCACHEFUNC(dve, name, expr, p, g) {
        if (dve.calculateExpression && dve.calculateExpression[name]) {
            var uce = dve.disableCacheExpression;
            if (!uce || uce != "disabled") {
                console.log(dve.calculateExpression[name].toString() + " => " + dve.calculateExpression[name](p, g));
                return dve.calculateExpression[name](p, g);
            }
        }

        var tokens = expr.toString().split(/([\+\-]+)/g);
        
        if (tokens.length == 0) return expr;
        
        var strExpression = "", op = "+", num = 0, n = 0;
        for (var i = 0, len = tokens.length, c = ""; i < len; i++) {
            c = tokens[i];
            if (c == "+") {
                op = "+";
                strExpression += "+";
                continue;
            } else if (c == "-") {
                op = "-";
                strExpression += "-";
                continue;
            } else if (c.charAt(c.length - 1) == "%") {
                n = (p * parseFloat(c) / 100);
                strExpression += "(p*" + parseFloat(c) + "/100)";
            } else if (c.charAt(0) == "{" && c.charAt(c.length - 1) == "}") {
                n = g[c.substring(1, c.length - 1)];
                strExpression += "g['" + c.substring(1, c.length - 1) + "']";
            } else {
                n = parseFloat(c);
                strExpression += parseFloat(c).toString();
            }

            switch (op) {
                case "+": num += n; break;
                case "-": num -= n; break;
            }

            if (!dve.calculateExpression) dve.calculateExpression = {};
            dve.calculateExpression[name] = new Function("p", "g", "return " + strExpression +";");
        }

        return num;
    }

    function RELAYOUT(dve, w, h, dic) {
        if (dve.name != "g") {
            var str = dve.autoLayout, v = 0;
            if (str) {
                var layouts = PARSELAYOUT(str);
                for (var n in layouts) {
                    v = COMPUTEEXPRWITHCACHEFUNC(dve, n, layouts[n], (["x", "x1", "x2", "cx", "dx", "width"].indexOf(n) >= 0 ? w : h), dic);
                    if ((n == "width" || n == "height") && v < 0) v = 0;
                    if (n == "width") w = v;
                    else if (n == "height") h = v;
                    dve.attr(n, v);
                }
            }

            w = (dve.element.width && ISDEF(dve.element.width.baseVal)) ? dve.element.width.baseVal.value : w;
            h = (dve.element.height && ISDEF(dve.element.height.baseVal)) ? dve.element.height.baseVal.value : h;
        }

        for (var i = 0, len = dve.children.length, child = null; i < len; i++) {
            child = dve.children[i];
            if (child.element.nodeType === 1) {
                RELAYOUT(child, w, h, dic);
            }
        }
    }

    
    /* Drawing Vector Element */

    var DVE = function (element, parent) {
        this.name = element.tagName;
        this.element = element;
        this.autolayout = "";
        this.transformation = [];
        this.children = [];
        this.parent = parent ? parent : null;
    };

    DVE.prototype.setAutoLayout = function (definition) {
        this.autoLayout = definition;
        return this;
    };

    DVE.prototype.updateLayout = function (dic) {
        dic = dic || {};
        var size = GETELMSIZE(this.element);
        for (var i = 0, len = this.children.length, child = null; i < len; i++) {
            child = this.children[i];
            if (child.element.nodeType === 1) {
                RELAYOUT(child, size.w, size.h, dic);
            }
        }
    };

    DVE.prototype.attr = function (name, value, appending) {
        if (!ISDEF(name)) return this;
        if (!ISDEF(value)) {
            if (ISXLINK(name))
                return this.element.getAttributeNS(NS_XLNK, name.substring(6));
            else
                return this.element.getAttributeNS(null, name);
        } else {
            if (appending) {
                var oldv = this.attr(name);
                if (oldv && oldv.length > 0) {
                    value = oldv + " " + value;
                }
            }
            this.element.setAttributeNS(ISXLINK(name) ? NS_XLNK : null, name, value);
            return this;
        }
    };

    DVE.prototype.rmattr = function (name, value) {
        if (!ISDEF(name)) return this;
        if (!ISDEF(value)) {
            if (ISXLINK(name))
                this.element.removeAttributeNS(NS_XLNK, name.substring(6));
            else
                this.element.removeAttributeNS(null, name);
        } else {
            var oldv = this.attr(name);
            if (oldv && oldv.length > 0) {
                var tokens = oldv.split(" ");
                for (var i = 0; i < tokens.length;) {
                    if (tokens[i] == value) {
                        tokens.splice(i, 1);
                    } else {
                        i++;
                    }
                }
                oldv = tokens.join(" ");
                this.attr(name, oldv);
            }
        }
        return this;
    };

    DVE.prototype.id = function (id) {
        if (ISDEF(id))
            return this.attr("id", id);
        else if (ISDEF(this.element.id))
            return this.element.id;
        else
            return undefined;
    };

    DVE.prototype.ref = function () {
        var idstr = this.id();
        return ISDEF(idstr) ? "#" + idstr : undefined;
    };

    DVE.prototype.has = function (element) {
        return (element instanceof DVE) ? (this.children.indexOf(element) >= 0) : false;
    };

    DVE.prototype.detach = function () {
        if (this.parent) {
            var idx = this.parent.children.indexOf(this);
            if (idx >= 0) this.parent.children.splice(idx, 1);
            this.parent = null;
        }
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        return this;
    };

    DVE.prototype.append = function () {
        if (arguments.length > 1) {
            for (var i = 0, len = arguments.length; i < len; i++) {
                this.append(arguments[i]);
            }
        } else {
            var child = arguments[0];
            if (child instanceof DVE) {
                child.detach();
                this.element.appendChild(child.element);
                this.children.push(child);
                child.parent = this;
            } else {
                console.log("[DV] The child parameter must be an instance of the DVE.");
            }
        }
        return this;
    };

    DVE.prototype.into = function (container) {
        if (typeof container === "string") {
            container = doc.querySelector(REFINEID(container, true));
        }
        if (container instanceof DVE) {
            container.append(this);
        } else if (container.appendChild) {
            this.detach();
            container.appendChild(this.element);
        } else {
            console.log("[DV] The parent parameter is not an instance of the DVE or HTMLElement.");
        }
        return this;
    };

    DVE.prototype.class = function (className, append) {
        if (!ISDEF(className)) return this.attr("class");
        else return this.attr("class", className, append === true);
    };

    DVE.prototype.css = function (sname, svalue) {
        var oldvs = this.attr("style");
        if (ISDEF(sname) && ISDEF(svalue)) {
            if (oldvs) {
                var items = [];
                var regex = /([a-z-]+)\s*\:\s*([^;$]+)/gi;
                var rs = regex.exec(oldvs);
                while (rs != null) {
                    if (rs[1].toLowerCase() == sname.toLowerCase())
                        items.push(sname + ":" + svalue);
                    else
                        items.push(rs[1] + ":" + rs[2]);
                    // more
                    rs = regex.exec(oldvs);
                }
                this.attr("style", items.join(";"));
            } else {
                this.attr("style", sname + ":" + svalue);
            }
            return this;
        } if (ISDEF(sname) && !ISDEF(svalue)) {
            if (oldvs) {
                var regex = /([a-z-]+)\s*\:\s*([^;$]+)/gi;
                var rs = regex.exec(oldvs);
                while (rs != null) {
                    if (rs[1].toLowerCase() == sname.toLowerCase())
                        return rs[2];
                    // more
                    rs = regex.exec(oldvs);
                }
            }
            return undefined;
        } else {
            return this;
        }
    };

    DVE.prototype.point = function (x, y) {
        if (["filter", "foreignObject", "image", "pattern", "rect", "svg", "use", "mask"].indexOf(this.name) == -1) return this;
        if (ISDEF(x)) this.attr("x", x);
        if (ISDEF(y)) this.attr("y", y);
        return this;
    };

    DVE.prototype.point1 = function (x1, y1) {
        if (["line", "linearGradient"].indexOf(this.name) == -1) return this;
        if (ISDEF(x1)) this.attr("x1", x1);
        if (ISDEF(y1)) this.attr("y1", y1);
        return this;
    };

    DVE.prototype.point2 = function (x2, y2) {
        if (["line", "linearGradient"].indexOf(this.name) == -1) return this;
        if (ISDEF(x2)) this.attr("x2", x2);
        if (ISDEF(y2)) this.attr("y2", y2);
        return this;
    };

    DVE.prototype.points = function (listOfPoints) {
        if (["polygon", "polyline"].indexOf(this.name) == -1) return this;
        if (ISDEF(listOfPoints)) this.attr("points", CNVTLISTOFPOINTSTR(listOfPoints));
        return this;
    };

    DVE.prototype.bound = function (x1, y1, x2, y2) {
        return this.point1(x1, y1).point2(x2, y2);
    };

    DVE.prototype.size = function (w, h) { 
        if (["filter", "foreignObject", "image", "pattern", "rect", "svg", "use", "mask"].indexOf(this.name) == -1) return this;
        if (ISDEF(w)) this.attr("width", w);
        if (ISDEF(h)) this.attr("height", h);
        return this;
    };

    DVE.prototype.center = function (cx, cy) {
        if (["circle", "ellipse", "radialGradient"].indexOf(this.name) == -1) return this;
        if (ISDEF(cx)) this.attr("cx", cx);
        if (ISDEF(cy)) this.attr("cy", cy);
        return this;
    };

    DVE.prototype.radius = function (r) {
        if (["circle", "radialGradient"].indexOf(this.name) == -1) return this;
        if (ISDEF(r)) this.attr("r", r);
        return this;
    };

    DVE.prototype.focalPoint = function (fx, fy) {
        if ("radialGradient" != this.name) return this;
        if (ISDEF(fx)) this.attr("fx", fx);
        if (ISDEF(fy)) this.attr("fy", fy);
        return this;
    };

    DVE.prototype.round = function (rx, ry) {
        if (["rect", "ellipse"].indexOf(this.name) == -1) return this;
        if (ISDEF(rx)) this.attr("rx", rx);
        if (ISDEF(ry)) this.attr("ry", ry);
        return this;
    };

    DVE.prototype.dim = function (x, y, w, h) {
        return this.point(x, y).size(w, h);
    };

    DVE.prototype.viewbox = function (minx, miny, w, h) {
        if (["image", "marker", "pattern", "svg", "symbol", "view"].indexOf(this.name) == -1) return this;
        if (ISDEF(minx, miny, w, h)) return this.attr("viewBox", [minx, miny, w, h].join(" "));
        return this;
    };

    DVE.prototype.aspectRatio = function (align, mos) {
        if (["feImage", "image", "marker", "pattern", "svg", "symbol", "view"].indexOf(this.name) == -1) return this;
        if (ISDEF(align)) this.attr("preserveAspectRatio", align);
        if (ISDEF(mos)) this.attr("preserveAspectRatio", mos, true);
        return this;
    };

    DVE.prototype.zoomAndPan = function (value) {
        if (this.name != "svg") return this;
        return this.attr("zoomAndPan", value);
    };

    DVE.prototype.fill = function (paint, opacity, rule) {
        if (E_NAME_ANI.indexOf(this.name) < 0 && E_NAME_SHP.indexOf(this.name) < 0 && E_NAME_TXT.indexOf(this.name) < 0 && "g" != this.name) return this;
        if (this.name == "line") return this;
        if (E_NAME_ANI.indexOf(this.name) >= 0 && ["freeze", "remove"].indexOf(paint) < 0) return this;
        if (ISDEF(paint)) this.attr("fill", paint);
        if (ISDEF(opacity)) this.attr("fill-opacity", opacity);
        if (ISDEF(rule)) this.attr("fill-rule", rule);
        return this;
    };

    DVE.prototype.nofill = function () {
        return this.fill("none");
    };

    DVE.prototype.stroke = function (paint, width, linecap, linejoin, dasharray, dashoffset, opacity) {
        if (E_NAME_SHP.indexOf(this.name) < 0 && "g" != this.name) return this;
        if (ISDEF(paint)) this.attr("stroke", paint);
        if (ISDEF(width)) this.attr("stroke-width", width);
        if (ISDEF(linecap)) this.attr("stroke-linecap", linecap);
        if (ISDEF(linejoin)) this.attr("stroke-linejoin", linejoin);
        if (ISDEF(dasharray)) this.attr("stroke-dasharray", dasharray);
        if (ISDEF(dashoffset)) this.attr("stroke-dashoffset", dashoffset);
        if (ISDEF(opacity)) this.attr("stroke-opacity", opacity);
        return this;
    };

    DVE.prototype.strokeWith = function (width) {
        if (E_NAME_SHP.indexOf(this.name) < 0 && "g" != this.name) return this;
        if (ISDEF(width)) this.attr("stroke-width", width);
        return this;
    };

    DVE.prototype.strokeLinecap = function (linecap) {
        if (E_NAME_SHP.indexOf(this.name) < 0 && "g" != this.name) return this;
        if (ISDEF(linecap)) this.attr("stroke-linecap", linecap);
        return this;
    };

    DVE.prototype.strokeLinejoin = function (linejoin, miterlimit) {
        if (E_NAME_SHP.indexOf(this.name) < 0 && "g" != this.name) return this;
        if (ISDEF(linejoin)) this.attr("stroke-linejoin", linejoin);
        if (ISDEF(miterlimit) && miterlimit >= 1.0 && linejoin === "miter") this.attr("stroke-miterlimit", miterlimit);
        return this;
    };

    DVE.prototype.strokeDash = function (array, offset) {
        if (E_NAME_SHP.indexOf(this.name) < 0 && "g" != this.name) return this;
        if (ISDEF(array)) this.attr("stroke-dasharray", array);
        if (ISDEF(offset)) this.attr("stroke-dashoffset", offset);
        return this;
    };

    DVE.prototype.strokeOpacity = function (opacity) {
        if (E_NAME_SHP.indexOf(this.name) < 0 && "g" != this.name) return this;
        if (ISDEF(opacity)) this.attr("stroke-opacity", opacity);
        return this;
    };

    DVE.prototype.xhref = function (value) {
        if (["a", "image", "marker", "mask", "pattern", "foreignObject", "filter", "script", "style", "switch", "text", "view", "textPath", "use", "animate", "set", "animateMotion", "animateTransform", "mpath"].indexOf(this.name) == -1) return this;
        if (ISDEF(value)) {
            if (value instanceof DVE) this.attr("xlink:href", value.ref());
            else this.attr("xlink:href", value);
        }
        return this;
    };

    DVE.prototype.target = function (value) {
        if (["a"].indexOf(this.name) == -1) return this;
        // _repalce, _self, _parent, _top, _blank & XML name
        if (ISDEF(value)) this.attr("target", value);
        return this;
    };

    DVE.prototype.txt = function (text, append) {
        if (ISDEF(text)) {
            if (this.name == "tspan") {
                this.element.textContent = append ? this.element.textContent + text : text;
            } else if(["text", "title", "desc", "style", "textPath"].indexOf(this.name) >= 0) {
                var txtNode = doc.createTextNode(text);
                if (!append) {
                    while (this.element.lastChild) {
                        if (this.element.lastChild instanceof Node) {
                            this.element.removeChild(this.element.lastChild);
                        }
                    }
                }
                this.element.appendChild(txtNode);
            }
        }
        return this;
    };

    DVE.prototype.xys = function (xs, ys) {
        if (["text", "tspan"].indexOf(this.name) == -1) return this;
        if (ISDEF(xs)) this.attr("x", CNVTLISTOFVALUESTR(xs, ","));
        if (ISDEF(ys)) this.attr("y", CNVTLISTOFVALUESTR(ys, ","));
        return this;
    };

    DVE.prototype.tlength = function (length, adjust) {
        if (["text", "tspan", "textPath"].indexOf(this.name) == -1) return this;
        if (ISDEF(length)) this.attr("textLength", length);
        if (ISDEF(adjust)) this.attr("lengthAdjust", adjust);
        return this;
    };

    DVE.prototype.dxys = function (dx, dy) {
        if (["text", "tspan"].indexOf(this.name) == -1) return this;
        if (ISDEF(dx)) this.attr("dx", CNVTLISTOFVALUESTR(dx, ","));
        if (ISDEF(dy)) this.attr("dy", CNVTLISTOFVALUESTR(dy, ","));
        return this;
    };

    DVE.prototype.trotate = function (angles) {
        if (["text", "tspan"].indexOf(this.name) == -1) return this;
        if (ISDEF(angles)) this.attr("rotate", CNVTLISTOFVALUESTR(angles, ","));
        return this;
    };

    DVE.prototype.fsize = function (size) {
        if (["text", "tspan"].indexOf(this.name) == -1) return this;
        if (ISDEF(size)) this.attr("font-size", size);
        return this;
    };

    DVE.prototype.tanchor = function (anchor) {
        if (["text", "tspan"].indexOf(this.name) == -1) return this;
        if (["start", "middle", "end"].indexOf(anchor) >= 0) this.attr("text-anchor", anchor);
        return this;
    };

    DVE.prototype.startOffset = function (offset) {
        if (this.name != "textPath") return this;
        if (ISDEF(offset)) this.attr("startOffset", offset);
        return this;
    };

    DVE.prototype.pathMethod = function (method) {
        if (this.name != "textPath") return this;
        if (["align", "stretch"].indexOf(method) >= 0) this.attr("method", method);
        return this;
    };

    DVE.prototype.pathSpacing = function (spacing) {
        if (this.name != "textPath") return this;
        if (["auto", "exact"].indexOf(spacing) >= 0) this.attr("spacing", spacing);
        return this;
    };

    DVE.prototype.gradientUnits = function (unit) {
        if (["linearGradient", "radialGradient"].indexOf(this.name) == -1) return this;
        if (ISDEF(unit) && ["userSpaceOnUse", "objectBoundingBox"].indexOf(unit) >= 0) this.attr("gradientUnits", unit);
        return this;
    };

    DVE.prototype.spreadMethod = function (method) {
        if (["linearGradient", "radialGradient"].indexOf(this.name) == -1) return this;
        if (ISDEF(method) && ["pad", "reflect", "repeat"].indexOf(method) >= 0) this.attr("spreadMethod", method);
        return this;
    };

    DVE.prototype.stopOffset = function (offset) {
        if ("stop" != this.name) return this;
        if (ISDEF(offset)) this.attr("offset", offset);
        return this;
    };

    DVE.prototype.stopColor = function (color) {
        if ("stop" != this.name) return this;
        if (ISDEF(color)) this.attr("stop-color", color);
        return this;
    };

    DVE.prototype.stopOpacity = function (opacity) {
        if ("stop" != this.name) return this;
        if (ISDEF(opacity)) this.attr("stop-opacity", opacity);
        return this;
    };

    DVE.prototype.oco = function (offset, color, opacity) {
        return this.stopOffset(offset).stopColor(color).stopOpacity(opacity);
    };

    DVE.prototype.resettrans = function () {
        this.transformation = [];
        if (["linearGradient", "radialGradient"].indexOf(this.name) >= 0) {
            this.attr("gradientTransform", "");
        } else if (this.name == "pattern") {
            this.attr("patternTransform", "");
        } else {
            this.attr("transform", "");
        }
        return this;
    };

    DVE.prototype.translate = function (tx, ty) {
        if (!ISDEF(tx)) return this;
        var tran = ISDEF(ty) ? "translate(" + tx + "," + ty + ")" : "translate(" + tx + ")";
        this.transformation.push(tran);
        if (["linearGradient", "radialGradient"].indexOf(this.name) >= 0) {
            this.attr("gradientTransform", tran, true);
        } else if (this.name == "pattern") {
            this.attr("patternTransform", tran, true);
        } else {
            this.attr("transform", tran, true);
        }
        return this;
    };

    DVE.prototype.scale = function (sx, sy) {
        if (ISDEF(sx)) {
            var trans = ISDEF(sy) ? "scale(" + sx + "," + sy + ")" : "scale(" + sx + ")";
            this.transformation.push(trans);
            if (["linearGradient", "radialGradient"].indexOf(this.name) >= 0)
                this.attr("gradientTransform", trans, true);
            else if (this.name == "pattern")
                this.attr("patternTransform", trans, true);
            else
                this.attr("transform", trans, true);
        }
        return this;    
    };

    DVE.prototype.rotate = function (angle, cx, cy) {
        if (angle) {
            var trans = ISDEF(cx, cy) ? "rotate(" + angle + "," + cx + "," + cy + ")" : "rotate(" + angle + ")";
            this.transformation.push(trans);
            if (["linearGradient", "radialGradient"].indexOf(this.name) >= 0)
                this.attr("gradientTransform", trans, true);
            else if (this.name == "pattern")
                this.attr("patternTransform", trans, true);
            else
                this.attr("transform", trans, true);
        }
        return this;
    };

    DVE.prototype.skewx = function (angle) {
        if (angle) {
            var trans = "skewX(" + angle + ")";
            this.transformation.push(trans);
            if (["linearGradient", "radialGradient"].indexOf(this.name) >= 0)
                this.attr("gradientTransform", trans, true);
            else if (this.name == "pattern")
                this.attr("patternTransform", trans, true);
            else
                this.attr("transform", trans, true);
        }
        return this;
    };

    DVE.prototype.skewy = function (angle) {
        if (angle) {
            var trans = "skewY(" + angle + ")";
            this.transformation.push(trans);
            if (["linearGradient", "radialGradient"].indexOf(this.name) >= 0)
                this.attr("gradientTransform", trans, true);
            else if (this.name == "pattern")
                this.attr("patternTransform", trans, true);
            else
                this.attr("transform", trans, true);
        }
        return this;
    };

    DVE.prototype.matrix = function (a, b, c, d, e, f) {
        var trans = "matrix(" + a + "," + b + "," + c + "," + d + "," + e + "," + f +")";
        this.transformation.push(trans);
        if (["linearGradient", "radialGradient"].indexOf(this.name) >= 0)
            this.attr("gradientTransform", trans, true);
        else if (this.name == "pattern")
            this.attr("patternTransform", trans, true);
        else
            this.attr("transform", trans, true);
        return this;
    };

    DVE.prototype.clipPathUnits = function (value) {
        if (this.name != "clipPath") return this;
        if (ISDEF(value)) this.attr("clipPathUnits", value);
        return this;
    };

    DVE.prototype.clipPath = function (pathiri) {
        if (E_NAME_CTN.indexOf(this.name) == -1 && E_NAME_GRP.indexOf(this.name) == -1 && this.name != "clipPath") return this;
        if (ISDEF(pathiri)) this.attr("clip-path", GETFNIRI(pathiri));
        return this;
    };

    DVE.prototype.clipRule = function (rule) {
        if (E_NAME_GRP.indexOf(this.name) == -1) return this;
        if (ISDEF(rule)) this.attr("clip-rule", rule);
        return this;
    };

    DVE.prototype.d = function (value, append) {
        if (this.name != "path") return this;
        if (ISDEF(value)) this.attr("d", value, append === true);
        return this;
    };

    DVE.prototype.pathLength = function (length) {
        if (this.name != "path") return this;
        if (ISDEF(length)) this.attr("pathLength", length);
        return this;
    };

    DVE.prototype.mto = function (x, y, rel) {
        if (this.name != "path") return this;
        return this.d((rel === true ? "m" : "M") + x + "," + y, true);
    };

    DVE.prototype.lto = function (x, y, rel) {
        if (this.name != "path") return this;
        return this.d((rel === true ? "l" : "L") + x + "," + y, true);
    };

    DVE.prototype.hto = function (x, rel) {
        if (this.name != "path") return this;
        return this.d((rel === true ? "h" : "H") + x, true);
    };

    DVE.prototype.vto = function (y, rel) {
        if (this.name != "path") return this;
        return this.d((rel === true ? "v" : "V") + y, true);
    };

    DVE.prototype.cto = function (points, rel) {
        if (this.name != "path") return this;
        if (points instanceof Array) {
            if (points.length == 3) {
                this.d((rel === true ? "c" : "C") + CNVTLISTOFPOINTSTR(points), true);
            } else if (points.length == 2) {
                this.d((rel === true ? "s" : "S") + CNVTLISTOFPOINTSTR(points), true);
            }
        }
        return this;
    };

    DVE.prototype.csto = function (curvepoints, rel) {
        if (this.name != "path") return this;
        if (curvepoints instanceof Array) {
            var poly = "", cmd = null;
            for (var i = 0; i < curvepoints.length; i++) {
                if (curvepoints[i].length == 3) {
                    if (cmd == "c" || cmd == "C") {
                        poly += (poly.length > 0) ? " " + CNVTLISTOFPOINTSTR(curvepoints[i]) : CNVTLISTOFPOINTSTR(curvepoints[i]);
                    } else {
                        cmd = (rel === true ? "c" : "C");
                        poly += (poly.length > 0) ? " " + cmd + CNVTLISTOFPOINTSTR(curvepoints[i]) : cmd + CNVTLISTOFPOINTSTR(curvepoints[i]);
                    }
                } else if (curvepoints[i].length == 2) {
                    if (cmd == "s" || cmd == "S") {
                        poly += (poly.length > 0) ? " " + CNVTLISTOFPOINTSTR(curvepoints[i]) : CNVTLISTOFPOINTSTR(curvepoints[i]);
                    } else {
                        cmd = (rel === true ? "s" : "S");
                        poly += (poly.length > 0) ? " " + cmd + CNVTLISTOFPOINTSTR(curvepoints[i]) : cmd + CNVTLISTOFPOINTSTR(curvepoints[i]);
                    }
                }
            }

            this.d(poly, true);
        }
        return this;
    };

    DVE.prototype.qto = function (points, rel) {
        if (this.name != "path") return this;
        if (points instanceof Array) {
            if (points.length == 2) {
                this.d((rel === true ? "q" : "Q") + CNVTLISTOFPOINTSTR(points), true);
            } else if (points.length == 1) {
                this.d((rel === true ? "t" : "T") + CNVTLISTOFPOINTSTR(points), true);
            }
        }
        return this;
    };

    DVE.prototype.qsto = function (curvepoints, rel) {
        if (this.name != "path") return this;
        if (curvepoints instanceof Array) {
            var poly = "", cmd = null;
            for (var i = 0; i < curvepoints.length; i++) {
                if (curvepoints[i].length == 2) {
                    if (cmd == "q" || cmd == "Q") {
                        poly += (poly.length > 0) ? " " + CNVTLISTOFPOINTSTR(curvepoints[i]) : CNVTLISTOFPOINTSTR(curvepoints[i]);
                    } else {
                        cmd = (rel === true ? "q" : "Q");
                        poly += (poly.length > 0) ? " " + cmd + CNVTLISTOFPOINTSTR(curvepoints[i]) : cmd + CNVTLISTOFPOINTSTR(curvepoints[i]);
                    }
                } else if (curvepoints[i].length == 1) {
                    if (cmd == "t" || cmd == "T") {
                        poly += (poly.length > 0) ? " " + CNVTLISTOFPOINTSTR(curvepoints[i]) : CNVTLISTOFPOINTSTR(curvepoints[i]);
                    } else {
                        cmd = (rel === true ? "t" : "T");
                        poly += (poly.length > 0) ? " " + cmd + CNVTLISTOFPOINTSTR(curvepoints[i]) : cmd + CNVTLISTOFPOINTSTR(curvepoints[i]);
                    }                }
            }

            this.d(poly, true);
        }
        return this;
    };

    DVE.prototype.arc = function (rx, ry, xar, laf, swf, x, y, rel) {
        if (this.name != "path") return this;
        return this.d((rel === true ? "a" : "A") + rx + "," + ry + " " + xar + " " + laf + "," + swf + " " + x + "," + y, true);
    };

    DVE.prototype.arcf = function (rx, ry, xar) {
        if (this.name != "path") return this;
        if (!ISDEF(ry)) ry = rx;
        this.d("a" + rx + "," + ry + " " + (ISDEF(xar) ? xar : "0") + " 0,1 0," + (ry * 2), true);
        this.d("a" + rx + "," + ry + " " + (ISDEF(xar) ? xar : "0") + " 0,1 0," + -(ry * 2), true);
        return this;
    };

    DVE.prototype.pz = function () {
        if (this.name != "path") return this;
        // The 'z' and 'Z' are same commands.
        return this.d("z", true);
    };

    DVE.prototype.markerPoint = function (x, y) {
        if (this.name != "marker") return this;
        if (ISDEF(x)) this.attr("refX", x);
        if (ISDEF(y)) this.attr("refY", y);
        return this;
    };

    DVE.prototype.markerSize = function (w, h) {
        if (this.name != "marker") return this;
        if (ISDEF(w)) this.attr("markerWidth", w);
        if (ISDEF(h)) this.attr("markerHeight", h);
        return this;
    };

    DVE.prototype.markerDim = function (x, y, w, h, orient) {
        return this.markerPoint(x, y).markerSize(w, h).markerOrient(orient);
    };

    DVE.prototype.markerUnits = function (unit) {
        if (this.name != "marker") return this;
        if (ISDEF(unit)) this.attr("markerUnits", unit);
        return this;
    };

    DVE.prototype.markerOrient = function (orient) {
        if (this.name != "marker") return this;
        if (ISDEF(orient)) this.attr("orient", orient);
        return this;
    };

    DVE.prototype.mark = function (marker, pos) {
        if (E_NAME_PTH.indexOf(this.name) == -1) return this;
        if (ISDEF(marker)) {
            if (pos == "s") this.attr("marker-start", GETFNIRI(marker));
            else if (pos == "m") this.attr("marker-mid", GETFNIRI(marker));
            else if (pos == "e") this.attr("marker-end", GETFNIRI(marker));
            else if (pos == "a") this.attr("marker", GETFNIRI(marker));
        }
        return this;
    };

    DVE.prototype.patternUnits = function (unit) {
        if (this.name != "pattern") return this;
        if (ISDEF(unit)) this.attr("patternUnits", unit);
        return this;
    };

    DVE.prototype.patternContentUnits = function (unit) {
        if (this.name != "pattern") return this;
        if (ISDEF(unit)) this.attr("patternContentUnits", unit);
        return this;
    };

    DVE.prototype.visible = function (torf) {
        if (ISDEF(torf)) this.attr("visibility", torf === true ? "visible" : "hidden");
        return this;
    };

    DVE.prototype.requiredFeatures = function (value) {
        if (ISDEF(value)) this.attr("requiredFeatures", CNVTLISTOFVALUESTR(value));
        return this;
    };

    DVE.prototype.requiredExtensions = function (value) {
        if (ISDEF(value)) this.attr("requiredExtensions", CNVTLISTOFVALUESTR(value));
        return this;
    };

    DVE.prototype.systemLanguage = function (value) {
        if (ISDEF(value)) this.attr("systemLanguage", CNVTLISTOFVALUESTR(value, ", "));
        return this;
    };

    DVE.prototype.toWhat = function (target) {
        var type = "auto";
        if (["animate", "set"].indexOf(this.name) >= 0) {
            if (["x", "y", "width", "height"].indexOf(target) >= 0) type = "XML";
            else if (["fill", "opacity"].indexOf(target) >= 0) type = "CSS";
            this.attr("attributeName", target).attr("attributeType", type);
        } else if (this.name == "animateTransform") {
            if (["translate", "scale", "rotate", "skewX", "skewY"].indexOf(target) == -1) return this;
            this.attr("attributeName", "transform").attr("attributeType", "XML").attr("type", target);
        } else if (this.name == "animateMotion") {
            this.attr("path", target);
        }
        return this;
    };

    DVE.prototype.keyFrom = function (value) {
        if (["animate", "animateMotion", "animateTransform"].indexOf(this.name) == -1) return this;
        if (ISDEF(value)) this.attr("from", value);
        return this;
    };

    DVE.prototype.keyTo = function (value) {
        if (["animate", "set", "animateMotion", "animateTransform"].indexOf(this.name) == -1) return this;
        if (ISDEF(value)) this.attr("to", value);
        return this;
    };

    DVE.prototype.keyBy = function (value) {
        if (["animate", "animateMotion"].indexOf(this.name) == -1) return this;
        if (ISDEF(value)) this.attr("by", value);
        return this;
    };

    DVE.prototype.fromToBy = function (from, to, by) {
        return this.keyFrom(from).keyTo(to).keyBy(by);
    };

    DVE.prototype.calcMode = function (value) {
        if (["animate", "animateMotion"].indexOf(this.name) == -1) return this;
        if (["discrete", "linear", "paced", "spline"].indexOf(value) == -1) return this;
        this.attr("calcMode", value);
        return this;
    };

    DVE.prototype.keyValues = function (values) {
        if (["animate", "animateMotion"].indexOf(this.name) == -1) return this;
        if (!ISDEF(values)) return this;
        this.attr("values", Array.isArray(values) ? values.join(";") : values);
        return this;
    };

    DVE.prototype.keyTimes = function (times) {
        if (["animate", "animateMotion"].indexOf(this.name) == -1) return this;
        if (!ISDEF(times)) return this;
        return this.attr("keyTimes", Array.isArray(times) ? times.join(";") : times);
    };

    DVE.prototype.keySplines = function (splines) {
        if (["animate", "animateMotion"].indexOf(this.name) == -1) return this;
        if (!ISDEF(splines)) return this;
        return this.attr("keySplines", Array.isArray(splines) ? splines.join(" ") : splines);
    };

    DVE.prototype.keyPoints = function (points) {
        if (["animateMotion"].indexOf(this.name) == -1) return this;
        if (ISDEF(points)) this.attr("keyPoints", Array.isArray(points) ? points.join(";") : points);
        return this;
    };

    var easings = { 
        "inSine":       [0.47, 0, 0.745, 0.715],
        "outSine":      [0.39, 0.575, 0.565, 1],
        "inOutSine":    [0.445, 0.05, 0.55, 0.95],
        "inQuad":       [0.55, 0.085, 0.68, 0.53],
        "outQuad":      [0.25, 0.46, 0.45, 0.94],
        "inOutQuad":    [0.455, 0.03, 0.515, 0.955],
        "inCubic":      [0.55, 0.055, 0.675, 0.19],
        "outCubic":     [0.215, 0.61, 0.355, 1],
        "inOutCubic":   [0.645, 0.045, 0.355, 1],
        "inQuart":      [0.895, 0.03, 0.685, 0.22],
        "outQuart":     [0.165, 0.84, 0.44, 1],
        "inOutQuart":   [0.77, 0, 0.175, 1],
        "inQuint":      [0.755, 0.05, 0.855, 0.06],
        "outQuint":     [0.23, 1, 0.32, 1],
        "inOutQuint":   [0.86, 0, 0.07, 1],
        "inExpo":       [0.95, 0.05, 0.796, 0.035],
        "outExpo":      [0.19, 1, 0.22, 1],
        "inOutExpo":    [1, 0, 0, 1],
        "inCirc":       [0.6, 0.04, 0.98, 0.335],
        "outCirc":      [0.075, 0.82, 0.165, 1],
        "inOutCirc":    [0.785, 0.135, 0.15, 0.86],
        "inBack":       [0.6, -0.28, 0.735, 0.045],
        "outBack":      [0.175, 0.885, 0.32, 1.275],
        "inOutBack":    [0.68, -0.55, 0.265, 1.55]
    };

    DVE.prototype.ease = function (funcName) {
        if (["animate", "animateMotion"].indexOf(this.name) == -1) return this;
        if (typeof easings[funcName] == "undefined") return this;
        return this.calcMode("spline").keyTimes("0;1").keySplines(easings[funcName]);
    };

    DVE.prototype.timeBegin = function (value) {
        if (["animate", "set", "animateMotion", "animateTransform"].indexOf(this.name) == -1) return this;
        if (ISDEF(value)) this.attr("begin", value);
        return this;
    };

    DVE.prototype.timeDur = function (value) {
        if (["animate", "set", "animateMotion", "animateTransform"].indexOf(this.name) == -1) return this;
        if (ISDEF(value)) this.attr("dur", value);
        return this;
    };

    DVE.prototype.timeEnd = function (value) {
        if (["animate", "set", "animateMotion", "animateTransform"].indexOf(this.name) == -1) return this;
        if (ISDEF(value)) this.attr("end", value);
        return this;
    };

    DVE.prototype.time = function (begin, dur, end) {
        return this.timeBegin(begin).timeDur(dur).timeEnd(end);
    };

    DVE.prototype.timeMin = function (value) {
        if (["animate", "set", "animateMotion", "animateTransform"].indexOf(this.name) == -1) return this;
        if (ISDEF(value)) this.attr("min", value);
        return this;
    };

    DVE.prototype.timeMax = function (value) {
        if (["animate", "set", "animateMotion", "animateTransform"].indexOf(this.name) == -1) return this;
        if (ISDEF(value)) this.attr("max", value);
        return this;
    };

    DVE.prototype.restart = function (value) {
        if (["animate", "set", "animateMotion", "animateTransform"].indexOf(this.name) == -1) return this;
        if (["always", "whenNotActive", "never"].indexOf(value) == -1) return this;
        this.attr("restart", value);
        return this;
    };

    DVE.prototype.repeatCount = function (value) {
        if (["animate", "set", "animateMotion"].indexOf(this.name) == -1) return this;
        if (ISDEF(value)) this.attr("repeatCount", value);
        return this;
    };

    DVE.prototype.repeatDur = function (value) {
        if (["animate", "set", "animateMotion"].indexOf(this.name) == -1) return this;
        if (ISDEF(value)) this.attr("repeatDur", value);
        return this;
    };

    DVE.prototype.freeze = function () {
        if (["animate", "set", "animateMotion", "animateTransform"].indexOf(this.name) == -1) return this;
        return this.attr("fill", "freeze");
    };


    DVE.prototype.add = function (value) {
        if (["animate", "set", "animateMotion", "animateTransform"].indexOf(this.name) == -1) return this;
        if (["replace", "sum"].indexOf(value) == -1) return this;
        return this.attr("additive", value);
    };

    DVE.prototype.acc = function (value) {
        if (["animate", "set", "animateMotion", "animateTransform"].indexOf(this.name) == -1) return this;
        if (["none", "sum"].indexOf(value) == -1) return this;
        return this.attr("accumulate", value);
    };

    DVE.prototype.motionRotate = function (value) {
        if (["animateMotion"].indexOf(this.name) == -1) return this;
        if (ISDEF(value)) this.attr("rotate", value);
        return this;
    };

    DVE.prototype.motionPath = function (value) {
        if (["animateMotion"].indexOf(this.name) == -1) return this;
        if (ISDEF(value)) this.attr("path", value);
        return this;
    };

    DVE.prototype.bind = function (type, listener, useCapture) {
        useCapture = useCapture || false;
        switch (type) {
            case "load": this.element.addEventListener("SVGLoad", listener, useCapture); break;
            case "unload": this.element.addEventListener("SVGUnload", listener, useCapture); break;
            case "abort": this.element.addEventListener("SVGAbort", listener, useCapture); break;
            case "error": this.element.addEventListener("SVGError", listener, useCapture); break;
            case "resize": this.element.addEventListener("SVGResize", listener, useCapture); break;
            case "scroll": this.element.addEventListener("SVGScroll", listener, useCapture); break;
            case "zoom": this.element.addEventListener("SVGZoom", listener, useCapture); break;
            case "focusin": this.element.addEventListener("DOMFocusIn", listener, useCapture); break;
            case "focusout": this.element.addEventListener("DOMFocusOut", listener, useCapture); break;
            case "activate": this.element.addEventListener("DOMActivate", listener, useCapture); break;
            case "click": this.element.addEventListener("click", listener, useCapture); break;
            case "mousedown": this.element.addEventListener("mousedown", listener, useCapture); break;
            case "mouseup": this.element.addEventListener("mouseup", listener, useCapture); break;
            case "mouseover": this.element.addEventListener("mouseover", listener, useCapture); break;
            case "mousemove": this.element.addEventListener("mousemove", listener, useCapture); break;
            case "mouseout": this.element.addEventListener("mouseout", listener, useCapture); break;
        }
        return this;
    };
 
    DVE.prototype.unbind = function (type, listener) {
        switch (type) {
            case "load": this.element.removeEventListener("SVGLoad", listener); break;
            case "unload": this.element.removeEventListener("SVGUnload", listener); break;
            case "abort": this.element.removeEventListener("SVGAbort", listener); break;
            case "error": this.element.removeEventListener("SVGError", listener); break;
            case "resize": this.element.removeEventListener("SVGResize", listener); break;
            case "scroll": this.element.removeEventListener("SVGScroll", listener); break;
            case "zoom": this.element.removeEventListener("SVGZoom", listener); break;
            case "focusin": this.element.removeEventListener("DOMFocusIn", listener); break;
            case "focusout": this.element.removeEventListener("DOMFocusOut", listener); break;
            case "activate": this.element.removeEventListener("DOMActivate", listener); break;
            case "click": this.element.removeEventListener("click", listener); break;
            case "mousedown": this.element.removeEventListener("mousedown", listener); break;
            case "mouseup": this.element.removeEventListener("mouseup", listener); break;
            case "mouseover": this.element.removeEventListener("mouseover", listener); break;
            case "mousemove": this.element.removeEventListener("mousemove", listener); break;
            case "mouseout": this.element.removeEventListener("mouseout", listener); break;
        }
        return this;
    };

    DVE.prototype.toString = function () {
        return "[object DVE] (" + this.name + ")";
    };

    /* Drawing Vector Object */

    var _dvFunc = function () {};

    _dvFunc.getFuncIRI = function (value) {
        return GETFNIRI(value);
    };

    _dvFunc.mk = function (name, props) {
        var em = new DVE(doc.createElementNS(NS_SVG, name));
        if (props) {
            for (var pname in props) {
                em.attr(pname, props[pname]);
            }
        }
        return em;
    };

    _dvFunc.svg = function (props) {
        // version, width, height, x, y, viewBox, preserveAspectRatio, zoomAndPan
        return this.mk("svg", props);
    };

    _dvFunc.g = function (props) {
        return this.mk("g", props);
    };

    _dvFunc.switchblock = function (props) {
        return this.mk("switch", props);
    };

    _dvFunc.styleblock = function (css) {
        return this.mk("style", { "type": "text/css" }).txt(css || "");
    };

    _dvFunc.defs = function (props) {
        return this.mk("defs", props);
    };

    _dvFunc.symbol = function (props) {
        return this.mk("symbol", props);
    };

    _dvFunc.use = function (props) {
        // x, y, width, height, xlink:href
        return this.mk("use", props);
    };

    _dvFunc.link = function (props) {
        // xlink:href, target
        return this.mk("a", props);
    };

    _dvFunc.rect = function (props) {
        // x, y, width, height, rx, ry
        return this.mk("rect", props);
    };

    _dvFunc.circle = function (props) {
        // cx, cy, r
        return this.mk("circle", props);
    };

    _dvFunc.ellipse = function (props) {
        // cx, cy, rx, ry
        return this.mk("ellipse", props);
    };

    _dvFunc.line = function (props) {
        // x1, y1, x2, y2
        return this.mk("line", props);
    };

    _dvFunc.polygon = function (props) {
        // points
        return this.mk("polygon", props);
    };

    _dvFunc.polyline = function (props) {
        // points
        return this.mk("polyline", props);
    };

    _dvFunc.image = function (props) {
        // x, y, width, height, xlink:href, preserveAspectRatio
        return this.mk("image", props);
    };

    _dvFunc.text = function (props) {
        // x, y, dx, dy, rotate, textLength, lengthAdjust
        return this.mk("text", props);
    };

    _dvFunc.tspan = function (props) {
        // x, y, dx, dy, rotate, textLength, lengthAdjust
        return this.mk("tspan", props);
    };

    _dvFunc.textPath = function (props) {
        // xlink:href, startOffset, method, spacing
        return this.mk("textPath", props);
    };

    _dvFunc.gradl = function (props) {
        // x1, y1, x2, y2, gradientUnits, spreadMethod
        return this.mk("linearGradient", props);
    };

    _dvFunc.gradr = function (props) {
        // cx, cy, r, fx, fy, gradientUnits, spreadMethod
        return this.mk("radialGradient", props);
    };

    _dvFunc.stop = function (props) {
        // offset, stop-color, stop-opacity
        return this.mk("stop", props);
    };

    _dvFunc.title = function (props) {
        return this.mk("title", props);
    };

    _dvFunc.desc = function (props) {
        return this.mk("desc", props);
    };

    _dvFunc.clipper = function (props) {
        // clipPathUnits
        return this.mk("clipPath", props);
    };

    _dvFunc.path = function (props) {
        // d, pathLength
        return this.mk("path", props);
    };

    _dvFunc.marker = function (props) {
        // refX, refY, markerWidth, markerHeight, orient, markerUnits
        return this.mk("marker", props);
    };

    _dvFunc.pattern = function (props) {
        // x, y, width, height, patternUnits, patternContentUnits, patternTransform
        return this.mk("pattern", props);
    };

    _dvFunc.animate = function (props) {
        return this.mk("animate", props);
    };

    _dvFunc.set = function (props) {
        return this.mk("set", props);
    };

    _dvFunc.animateMotion = function (props) {
        return this.mk("animateMotion", props);
    };

    _dvFunc.animateTransform = function (props) {
        return this.mk("animateTransform", props);
    };

    _dvFunc.mpath = function (props) {
        // xlink:href
        return this.mk("mpath", props);
    };

    win.DV = _dvFunc;

})(window, document);
