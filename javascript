/* =========================================
   browser.js
   ========================================= */

/* browser.js v1.0.1 | @ajlkn | MIT licensed */
const browser = (function () {
  "use strict";

  const api = {
    name: null,
    version: null,
    os: null,
    osVersion: null,
    touch: null,
    mobile: null,
    _canUse: null,

    canUse(property) {
      if (!api._canUse) api._canUse = document.createElement("div");

      const style = api._canUse.style;
      const prop = property.charAt(0).toUpperCase() + property.slice(1);

      return (
        property in style ||
        "Moz" + prop in style ||
        "Webkit" + prop in style ||
        "O" + prop in style ||
        "ms" + prop in style
      );
    },

    init() {
      const ua = navigator.userAgent;

      let name = "other";
      let version = 0;

      const browserPatterns = [
        ["firefox", /Firefox\/([0-9.]+)/],
        ["bb", /BlackBerry.+Version\/([0-9.]+)/],
        ["bb", /BB[0-9]+.+Version\/([0-9.]+)/],
        ["opera", /OPR\/([0-9.]+)/],
        ["opera", /Opera\/([0-9.]+)/],
        ["edge", /Edge\/([0-9.]+)/],
        ["safari", /Version\/([0-9.]+).+Safari/],
        ["chrome", /Chrome\/([0-9.]+)/],
        ["ie", /MSIE ([0-9]+)/],
        ["ie", /Trident\/.+rv:([0-9]+)/],
      ];

      for (const [browserName, pattern] of browserPatterns) {
        if (ua.match(pattern)) {
          name = browserName;
          version = parseFloat(RegExp.$1);
          break;
        }
      }

      api.name = name;
      api.version = version;

      let os = "other";
      let osVersion = 0;

      const osPatterns = [
        ["ios", /([0-9_]+) like Mac OS X/, (v) => v.replace(/_/g, ".")],
        ["ios", /CPU like Mac OS X/, () => 0],
        ["wp", /Windows Phone ([0-9.]+)/],
        ["android", /Android ([0-9.]+)/],
        ["mac", /Macintosh.+Mac OS X ([0-9_]+)/, (v) => v.replace(/_/g, ".")],
        ["windows", /Windows NT ([0-9.]+)/],
        ["bb", /BlackBerry.+Version\/([0-9.]+)/],
        ["bb", /BB[0-9]+.+Version\/([0-9.]+)/],
        ["linux", /Linux/],
        ["bsd", /BSD/],
        ["unix", /X11/],
      ];

      for (const [osName, pattern, parser] of osPatterns) {
        if (ua.match(pattern)) {
          os = osName;
          osVersion = parseFloat(parser ? parser(RegExp.$1) : RegExp.$1);
          break;
        }
      }

      if (
        os === "mac" &&
        "ontouchstart" in window &&
        [
          [1024, 1366],
          [834, 1112],
          [810, 1080],
          [768, 1024],
        ].some(([w, h]) => screen.width === w && screen.height === h)
      ) {
        os = "ios";
      }

      api.os = os;
      api.osVersion = osVersion;
      api.touch = os === "wp" ? navigator.msMaxTouchPoints > 0 : "ontouchstart" in window;
      api.mobile = ["wp", "android", "ios", "bb"].includes(os);
    },
  };

  api.init();
  return api;
})();

(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof exports === "object") {
    module.exports = factory();
  } else {
    root.browser = factory();
  }
})(this, function () {
  return browser;
});


/* =========================================
   breakpoints.js
   ========================================= */

/* breakpoints.js v1.0 | @ajlkn | MIT licensed */
const breakpoints = (function () {
  "use strict";

  function wrapper(config) {
    api.init(config);
  }

  const api = {
    list: null,
    media: {},
    events: [],

    init(config) {
      this.list = config;
      window.addEventListener("resize", this.poll.bind(this));
      window.addEventListener("orientationchange", this.poll.bind(this));
      window.addEventListener("load", this.poll.bind(this));
      window.addEventListener("fullscreenchange", this.poll.bind(this));
    },

    active(query) {
      if (!(query in this.media)) {
        this.media[query] = this.buildMediaQuery(query);
      }

      const mediaQuery = this.media[query];
      return mediaQuery !== false && window.matchMedia(mediaQuery).matches;
    },

    on(query, handler) {
      this.events.push({
        query,
        handler,
        state: false,
      });

      if (this.active(query)) {
        handler();
      }
    },

    poll() {
      for (const event of this.events) {
        if (this.active(event.query)) {
          if (!event.state) {
            event.state = true;
            event.handler();
          }
        } else {
          event.state = false;
        }
      }
    },

    buildMediaQuery(query) {
      let mode;
      let name;

      if (query.startsWith(">=")) {
        mode = "gte";
        name = query.slice(2);
      } else if (query.startsWith("<=")) {
        mode = "lte";
        name = query.slice(2);
      } else if (query.startsWith(">")) {
        mode = "gt";
        name = query.slice(1);
      } else if (query.startsWith("<")) {
        mode = "lt";
        name = query.slice(1);
      } else if (query.startsWith("!")) {
        mode = "not";
        name = query.slice(1);
      } else {
        mode = "eq";
        name = query;
      }

      if (!name || !(name in this.list)) {
        return false;
      }

      const value = this.list[name];

      if (!Array.isArray(value)) {
        return value.charAt(0) === "(" ? `screen and ${value}` : value;
      }

      let min = parseInt(value[0], 10);
      let max = parseInt(value[1], 10);
      let unit;

      if (isNaN(min)) {
        if (isNaN(max)) return false;
        unit = value[1].replace(String(max), "");
      } else {
        unit = value[0].replace(String(min), "");
      }

      if (isNaN(min)) {
        switch (mode) {
          case "gte":
            return "screen";
          case "lte":
          case "eq":
            return `screen and (max-width: ${max}${unit})`;
          case "gt":
          case "not":
            return `screen and (min-width: ${max + 1}${unit})`;
          case "lt":
            return "screen and (max-width: -1px)";
        }
      }

      if (isNaN(max)) {
        switch (mode) {
          case "gte":
          case "eq":
            return `screen and (min-width: ${min}${unit})`;
          case "lte":
            return "screen";
          case "gt":
            return "screen and (max-width: -1px)";
          case "lt":
          case "not":
            return `screen and (max-width: ${min - 1}${unit})`;
        }
      }

      switch (mode) {
        case "gte":
          return `screen and (min-width: ${min}${unit})`;
        case "lte":
          return `screen and (max-width: ${max}${unit})`;
        case "gt":
          return `screen and (min-width: ${max + 1}${unit})`;
        case "lt":
          return `screen and (max-width: ${min - 1}${unit})`;
        case "not":
          return `screen and (max-width: ${min - 1}${unit}), screen and (min-width: ${max + 1}${unit})`;
        case "eq":
        default:
          return `screen and (min-width: ${min}${unit}) and (max-width: ${max}${unit})`;
      }
    },
  };

  wrapper._ = api;
  wrapper.on = function (query, handler) {
    api.on(query, handler);
  };
  wrapper.active = function (query) {
    return api.active(query);
  };

  return wrapper;
})();

(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof exports === "object") {
    module.exports = factory();
  } else {
    root.breakpoints = factory();
  }
})(this, function () {
  return breakpoints;
});


/* =========================================
   util.js
   ========================================= */

(function ($) {
  "use strict";

  /**
   * Generate an indented list of links from a nav.
   */
  $.fn.navList = function () {
    return this.find("a")
      .map(function () {
        const $link = $(this);
        const depth = Math.max(0, $link.parents("li").length - 1);
        const href = $link.attr("href") || "";
        const target = $link.attr("target") || "";

        return `
          <a class="link depth-${depth}" ${target ? `target="${target}"` : ""} ${href ? `href="${href}"` : ""}>
            <span class="indent-${depth}"></span>
            ${$link.text()}
          </a>
        `;
      })
      .get()
      .join("");
  };

  /**
   * Panel-ify an element.
   */
  $.fn.panel = function (userConfig) {
    if (this.length === 0) return this;

    if (this.length > 1) {
      this.each(function () {
        $(this).panel(userConfig);
      });
      return this;
    }

    const $this = $(this);
    const $body = $("body");
    const $window = $(window);
    const id = $this.attr("id");

    const config = $.extend(
      {
        delay: 0,
        hideOnClick: false,
        hideOnEscape: false,
        hideOnSwipe: false,
        resetScroll: false,
        resetForms: false,
        side: null,
        target: $this,
        visibleClass: "visible",
      },
      userConfig
    );

    if (!(config.target instanceof jQuery)) {
      config.target = $(config.target);
    }

    $this._hide = function (event) {
      if (!config.target.hasClass(config.visibleClass)) return;

      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      config.target.removeClass(config.visibleClass);

      window.setTimeout(function () {
        if (config.resetScroll) $this.scrollTop(0);

        if (config.resetForms) {
          $this.find("form").each(function () {
            this.reset();
          });
        }
      }, config.delay);
    };

    $this
      .css("-ms-overflow-style", "-ms-autohiding-scrollbar")
      .css("-webkit-overflow-scrolling", "touch");

    if (config.hideOnClick) {
      $this.find("a").css("-webkit-tap-highlight-color", "rgba(0,0,0,0)");

      $this.on("click", "a", function (event) {
        const $a = $(this);
        const href = $a.attr("href");
        const target = $a.attr("target");

        if (!href || href === "#" || href === "" || href === "#" + id) return;

        event.preventDefault();
        event.stopPropagation();

        $this._hide();

        window.setTimeout(function () {
          if (target === "_blank") window.open(href);
          else window.location.href = href;
        }, config.delay + 10);
      });
    }

    $this
      .on("touchstart", function (event) {
        $this.touchPosX = event.originalEvent.touches[0].pageX;
        $this.touchPosY = event.originalEvent.touches[0].pageY;
      })
      .on("touchmove", function (event) {
        if ($this.touchPosX === null || $this.touchPosY === null) return;

        const diffX = $this.touchPosX - event.originalEvent.touches[0].pageX;
        const diffY = $this.touchPosY - event.originalEvent.touches[0].pageY;
        const th = $this.outerHeight();
        const ts = $this.get(0).scrollHeight - $this.scrollTop();

        if (config.hideOnSwipe) {
          let result = false;
          const boundary = 20;
          const delta = 50;

          switch (config.side) {
            case "left":
              result = diffY < boundary && diffY > -boundary && diffX > delta;
              break;
            case "right":
              result = diffY < boundary && diffY > -boundary && diffX < -delta;
              break;
            case "top":
              result = diffX < boundary && diffX > -boundary && diffY > delta;
              break;
            case "bottom":
              result = diffX < boundary && diffX > -boundary && diffY < -delta;
              break;
          }

          if (result) {
            $this.touchPosX = null;
            $this.touchPosY = null;
            $this._hide();
            return false;
          }
        }

        if (
          ($this.scrollTop() < 0 && diffY < 0) ||
          (ts > th - 2 && ts < th + 2 && diffY > 0)
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      });

    $this.on("click touchend touchstart touchmove", function (event) {
      event.stopPropagation();
    });

    $this.on("click", `a[href="#${id}"]`, function (event) {
      event.preventDefault();
      event.stopPropagation();
      config.target.removeClass(config.visibleClass);
    });

    $body.on("click touchend", function (event) {
      $this._hide(event);
    });

    $body.on("click", `a[href="#${id}"]`, function (event) {
      event.preventDefault();
      event.stopPropagation();
      config.target.toggleClass(config.visibleClass);
    });

    if (config.hideOnEscape) {
      $window.on("keydown", function (event) {
        if (event.keyCode === 27) $this._hide(event);
      });
    }

    return $this;
  };

  /**
   * Placeholder polyfill.
   */
  $.fn.placeholder = function () {
    if (typeof document.createElement("input").placeholder !== "undefined") {
      return $(this);
    }

    if (this.length === 0) return this;

    if (this.length > 1) {
      this.each(function () {
        $(this).placeholder();
      });
      return this;
    }

    const $this = $(this);

    $this
      .find('input[type=text],textarea')
      .each(function () {
        const i = $(this);

        if (i.val() === "" || i.val() === i.attr("placeholder")) {
          i.addClass("polyfill-placeholder").val(i.attr("placeholder"));
        }
      })
      .on("blur", function () {
        const i = $(this);

        if (i.attr("name").match(/-polyfill-field$/)) return;

        if (i.val() === "") {
          i.addClass("polyfill-placeholder").val(i.attr("placeholder"));
        }
      })
      .on("focus", function () {
        const i = $(this);

        if (i.attr("name").match(/-polyfill-field$/)) return;

        if (i.val() === i.attr("placeholder")) {
          i.removeClass("polyfill-placeholder").val("");
        }
      });

    $this.find('input[type=password]').each(function () {
      const i = $(this);
      const x = $(
        $("<div>")
          .append(i.clone())
          .remove()
          .html()
          .replace(/type="password"/i, 'type="text"')
          .replace(/type=password/i, "type=text")
      );

      if (i.attr("id") !== "") x.attr("id", i.attr("id") + "-polyfill-field");
      if (i.attr("name") !== "") x.attr("name", i.attr("name") + "-polyfill-field");

      x.addClass("polyfill-placeholder").val(x.attr("placeholder")).insertAfter(i);

      if (i.val() === "") i.hide();
      else x.hide();

      i.on("blur", function (event) {
        event.preventDefault();

        const x = i.parent().find(`input[name='${i.attr("name")}-polyfill-field']`);

        if (i.val() === "") {
          i.hide();
          x.show();
        }
      });

      x.on("focus", function (event) {
        event.preventDefault();

        const i = x.parent().find(
          `input[name='${x.attr("name").replace("-polyfill-field", "")}']`
        );

        x.hide();
        i.show().focus();
      }).on("keypress", function (event) {
        event.preventDefault();
        x.val("");
      });
    });

    $this
      .on("submit", function () {
        $this.find("input[type=text],input[type=password],textarea").each(function () {
          const i = $(this);

          if (i.attr("name").match(/-polyfill-field$/)) i.attr("name", "");

          if (i.val() === i.attr("placeholder")) {
            i.removeClass("polyfill-placeholder");
            i.val("");
          }
        });
      })
      .on("reset", function (event) {
        event.preventDefault();

        $this.find("select").val($("option:first").val());

        $this.find("input,textarea").each(function () {
          const i = $(this);
          let x;

          i.removeClass("polyfill-placeholder");

          switch (this.type) {
            case "submit":
            case "reset":
              break;

            case "password":
              i.val(i.attr("defaultValue"));
              x = i.parent().find(`input[name='${i.attr("name")}-polyfill-field']`);

              if (i.val() === "") {
                i.hide();
                x.show();
              } else {
                i.show();
                x.hide();
              }
              break;

            case "checkbox":
            case "radio":
              i.attr("checked", i.attr("defaultValue"));
              break;

            case "text":
            case "textarea":
              i.val(i.attr("defaultValue"));

              if (i.val() === "") {
                i.addClass("polyfill-placeholder");
                i.val(i.attr("placeholder"));
              }
              break;

            default:
              i.val(i.attr("defaultValue"));
              break;
          }
        });
      });

    return $this;
  };

  /**
   * Prioritize elements.
   */
  $.prioritize = function ($elements, condition) {
    const key = "__prioritize";

    if (!($elements instanceof jQuery)) {
      $elements = $($elements);
    }

    $elements.each(function () {
      const $e = $(this);
      const $parent = $e.parent();

      if ($parent.length === 0) return;

      if (!$e.data(key)) {
        if (!condition) return;

        const $p = $e.prev();
        if ($p.length === 0) return;

        $e.prependTo($parent);
        $e.data(key, $p);
      } else {
        if (condition) return;

        const $p = $e.data(key);
        $e.insertAfter($p);
        $e.removeData(key);
      }
    });
  };
})(jQuery);


/* =========================================
   main.js
   ========================================= */

(function ($) {
  "use strict";

  const $window = $(window);
  const $head = $("head");
  const $body = $("body");

  breakpoints({
    xlarge: ["1281px", "1680px"],
    large: ["981px", "1280px"],
    medium: ["737px", "980px"],
    small: ["481px", "736px"],
    xsmall: ["361px", "480px"],
    xxsmall: [null, "360px"],
    "xlarge-to-max": "(min-width: 1681px)",
    "small-to-xlarge": "(min-width: 481px) and (max-width: 1680px)",
  });

  $window.on("load", function () {
    window.setTimeout(function () {
      $body.removeClass("is-preload");
    }, 100);
  });

  let resizeTimeout;

  $window.on("resize", function () {
    $body.addClass("is-resizing");

    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(function () {
      $body.removeClass("is-resizing");
    }, 100);
  });

  if (!browser.canUse("object-fit") || browser.name === "safari") {
    $(".image.object").each(function () {
      const $this = $(this);
      const $img = $this.children("img");

      $img.css("opacity", "0");

      $this
        .css("background-image", 'url("' + $img.attr("src") + '")')
        .css("background-size", $img.css("object-fit") || "cover")
        .css("background-position", $img.css("object-position") || "center");
    });
  }

  const $sidebar = $("#sidebar");
  const $sidebarInner = $sidebar.children(".inner");

  breakpoints.on("<=large", function () {
    $sidebar.addClass("inactive");
  });

  breakpoints.on(">large", function () {
    $sidebar.removeClass("inactive");
  });

  if (browser.os === "android" && browser.name === "chrome") {
    $('<style>#sidebar .inner::-webkit-scrollbar { display: none; }</style>').appendTo($head);
  }

  $('<a href="#sidebar" class="toggle">Toggle</a>')
    .appendTo($sidebar)
    .on("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      $sidebar.toggleClass("inactive");
    });

  $sidebar.on("click", "a", function (event) {
    if (breakpoints.active(">large")) return;

    const $a = $(this);
    const href = $a.attr("href");
    const target = $a.attr("target");

    event.preventDefault();
    event.stopPropagation();

    if (!href || href === "#" || href === "") return;

    $sidebar.addClass("inactive");

    setTimeout(function () {
      if (target === "_blank") window.open(href);
      else window.location.href = href;
    }, 500);
  });

  $sidebar.on("click touchend touchstart touchmove", function (event) {
    if (breakpoints.active(">large")) return;
    event.stopPropagation();
  });

  $body.on("click touchend", function () {
    if (breakpoints.active(">large")) return;
    $sidebar.addClass("inactive");
  });

  $window.on("load.sidebar-lock", function () {
    let sh, wh;

    if ($window.scrollTop() === 1) $window.scrollTop(0);

    $window
      .on("scroll.sidebar-lock", function () {
        let x, y;

        if (breakpoints.active("<=large")) {
          $sidebarInner.data("locked", 0).css("position", "").css("top", "");
          return;
        }

        x = Math.max(sh - wh, 0);
        y = Math.max(0, $window.scrollTop() - x);

        if ($sidebarInner.data("locked") === 1) {
          if (y <= 0) {
            $sidebarInner.data("locked", 0).css("position", "").css("top", "");
          } else {
            $sidebarInner.css("top", -1 * x);
          }
        } else {
          if (y > 0) {
            $sidebarInner.data("locked", 1).css("position", "fixed").css("top", -1 * x);
          }
        }
      })
      .on("resize.sidebar-lock", function () {
        wh = $window.height();
        sh = $sidebarInner.outerHeight() + 30;
        $window.trigger("scroll.sidebar-lock");
      })
      .trigger("resize.sidebar-lock");
  });

  const $menu = $("#menu");
  const $menuOpeners = $menu.children("ul").find(".opener");

  $menuOpeners.each(function () {
    const $this = $(this);

    $this.on("click", function (event) {
      event.preventDefault();

      $menuOpeners.not($this).removeClass("active");
      $this.toggleClass("active");

      $window.triggerHandler("resize.sidebar-lock");
    });
  });
})(jQuery);
