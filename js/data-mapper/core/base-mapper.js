(function (global) {
  'use strict';

  function BaseDataMapper() {
    this.data = null;
    this.isDataLoaded = false;
  }

  BaseDataMapper.prototype.initialize = function () {
    var self = this;
    var url = 'standard-template-data.json?t=' + Date.now();
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load standard-template-data.json');
        return res.json();
      })
      .then(function (json) {
        // fetch 도중 admin 미리보기 데이터(INITIAL_DATA 등)가 도착했다면
        // fallback 으로 standard 데이터를 렌더해 admin 데이터를 덮어쓰지 않도록 중단
        if (window.previewHandler && window.previewHandler.adminDataReceived) return;
        self.data = json;
        self.isDataLoaded = true;
        self.mapPage();
      })
      .catch(function (err) {
        console.error('[BaseDataMapper] initialize error:', err);
      });
  };

  BaseDataMapper.prototype.mapPage = function () {};

  BaseDataMapper.prototype.updateData = function (newData) {
    this.data = newData;
    this.isDataLoaded = true;
    this.mapPage();
  };

  // ── 데이터 접근 헬퍼 ──────────────────────────────────────
  BaseDataMapper.prototype.getProperty = function () {
    return (this.data && this.data.property) || {};
  };

  BaseDataMapper.prototype.getHomepage = function () {
    return (this.data && this.data.homepage) || {};
  };

  BaseDataMapper.prototype.getCustomFields = function () {
    return this.getHomepage().customFields || {};
  };

  BaseDataMapper.prototype.getPages = function () {
    var pagesFromHomepage = this.getCustomFields().pages;
    if (pagesFromHomepage && Object.keys(pagesFromHomepage).length > 0) {
      return pagesFromHomepage;
    }

    if (this.data && this.data.customFields && this.data.customFields.pages) {
      return this.data.customFields.pages;
    }

    return {};
  };

  BaseDataMapper.prototype.getPropertyName = function () {
    var cf = this.getCustomFields();
    if (cf.property && cf.property.name) return cf.property.name;
    return this.getProperty().name || '';
  };

  // 숙소 영문명: customFields.property.nameEn 우선, 없으면 property.nameEn fallback (없으면 빈 문자열)
  BaseDataMapper.prototype.getPropertyNameEn = function () {
    var cf = this.getCustomFields();
    if (cf.property && cf.property.nameEn) return cf.property.nameEn;
    return this.getProperty().nameEn || '';
  };

  BaseDataMapper.prototype.getLogo = function () {
    var hp = this.getHomepage();
    var images = hp.images;
    if (!images || !images[0] || !images[0].logo) return '';
    var logos = images[0].logo;
    var selected = logos.find(function (l) { return l.isSelected; });
    return selected ? selected.url : (logos[0] ? logos[0].url : '');
  };

  // realtimeBookingId 는 "실시간예약링크" 같은 플레이스홀더/설명 문구가 그대로 들어올 수 있다.
  // 그걸 href 로 쓰면 상대경로로 해석돼 404 페이지로 이동하므로,
  // 실제 URL 로 보일 때만 링크로 취급하고 그 외에는 '#!'(비활성) 로 처리한다.
  BaseDataMapper.prototype.getBookingUrl = function () {
    var raw = this.getProperty().realtimeBookingId;
    if (typeof raw !== 'string') return '#!';

    var v = raw.trim();
    if (!v || v === '#!') return '#!';

    if (/^https?:\/\//i.test(v)) return v;      // http(s)://...
    if (/^\/\//.test(v)) return 'https:' + v;   // //도메인/...

    // 프로토콜 없이 도메인만 들어온 경우(booking.example.com/abc)는 https 를 붙여준다
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?([\/?#]|$)/i.test(v)) return 'https://' + v;

    return '#!';
  };

  // ── 이미지 헬퍼 ──────────────────────────────────────────
  BaseDataMapper.prototype.getSelectedImages = function (images) {
    if (!images || !images.length) return [];
    return images
      .filter(function (img) { return img.isSelected; })
      .sort(function (a, b) { return a.sortOrder - b.sortOrder; });
  };

  BaseDataMapper.prototype.getFirstSelectedImage = function (images) {
    var list = this.getSelectedImages(images);
    return list.length ? list[0].url : '';
  };

  // ── 객실타입(roomtypes) 공통 헬퍼 (room-mapper 와 동일 규칙) ───────
  // 객실명/이미지 = customFields.roomtypes, 그 외(상태·구성 등) = rooms[] (id 매칭)
  BaseDataMapper.prototype.getRoomtypes = function () {
    var cf = this.getCustomFields();
    if (cf.roomtypes && cf.roomtypes.length) return cf.roomtypes;
    if (this.data && this.data.customFields && this.data.customFields.roomtypes) {
      return this.data.customFields.roomtypes;
    }
    return cf.roomtypes || [];
  };

  // roomtypes[i].id === rooms[j].id 매칭
  BaseDataMapper.prototype.getMatchedRoom = function (roomtype) {
    if (!roomtype) return null;
    var rooms = (this.data && this.data.rooms) || [];
    return rooms.filter(function (r) { return r.id === roomtype.id; })[0] || null;
  };

  // roomtype 대표 썸네일 URL: roomtype_thumbnail → roomtype_interior → 그 외 (isSelected, sortOrder순 첫 이미지)
  BaseDataMapper.prototype.getRoomtypeThumbnailUrl = function (rt) {
    var imgs = (rt && rt.images) || [];
    var self = this;
    var pick = function (cat) {
      return self.getSelectedImages(imgs.filter(function (im) { return im.category === cat; }))[0];
    };
    var img = pick('roomtype_thumbnail') || pick('roomtype_interior') || this.getSelectedImages(imgs)[0];
    return img && img.url ? img.url : null;
  };

  BaseDataMapper.prototype.getRoomGroupName = function (roomtype) {
    return String((roomtype && (roomtype.groupname || roomtype.groupName || roomtype.group_name)) || '').trim();
  };
  BaseDataMapper.prototype.hasRoomGroups = function (roomtypes) {
    return (roomtypes || []).some(function (rt) { return !!String((rt && (rt.groupname || rt.groupName || rt.group_name)) || '').trim(); });
  };
  BaseDataMapper.prototype.getRoomMenuItems = function (roomtypes, resolveName) {
    var self = this;
    var list = roomtypes || [];
    if (!this.hasRoomGroups(list)) {
      return list.map(function (rt) { return { label: resolveName ? resolveName(rt) : (rt && rt.name) || '', roomtype: rt, roomtypes: [rt] }; });
    }
    var seen = {};
    var items = [];
    list.forEach(function (rt) {
      var groupName = self.getRoomGroupName(rt);
      var label = groupName || (resolveName ? resolveName(rt) : (rt && rt.name) || '');
      if (!String(label).trim()) return;
      var key = groupName ? 'group:' + groupName : 'room:' + rt.id;
      if (!seen[key]) { seen[key] = { label: label, groupName: groupName, roomtype: rt, roomtypes: [rt] }; items.push(seen[key]); }
      else { seen[key].roomtypes.push(rt); }
    });
    return items;
  };
  BaseDataMapper.prototype.getRoomMenuLabel = function (item) { return (item && item.label) || ''; };
  BaseDataMapper.prototype.getRoomMenuRoomtype = function (item) { return (item && item.roomtype) || item; };
  BaseDataMapper.prototype.getRoomMenuLink = function (item, paramName) {
    var roomtype = this.getRoomMenuRoomtype(item);
    return 'room.html?' + (paramName || 'room_id') + '=' + encodeURIComponent(roomtype && roomtype.id);
  };
  BaseDataMapper.prototype.isRoomMenuItemActive = function (item, currentId) {
    if (!item || !currentId) return false;
    return (item.roomtypes || []).some(function (rt) { return String(rt && rt.id) === String(currentId); });
  };

  BaseDataMapper.prototype.toPhoneList = function (value) {
    var fallbackPhone = '1833-9306';
    var list = [];
    if (Array.isArray(value)) {
      list = value.filter(function (v) { return typeof v === 'string' && v.trim(); });
    } else if (typeof value === 'string' && value.trim()) {
      list = [value];
    }
    return list.length > 0 ? list : [fallbackPhone];
  };

  // ── SEO 메타태그 업데이트 ──────────────────────────────────────
  BaseDataMapper.prototype.updateMetaTags = function (pageSEO) {
    var hp = this.getHomepage();
    var globalSEO = (hp && hp.seo) || {};
    var finalSEO = Object.assign({}, globalSEO, pageSEO || {});

    if (Object.keys(finalSEO).length > 0) {
      this.updateSEOInfo(finalSEO);
    }
  };

  BaseDataMapper.prototype.updateSEOInfo = function (seo) {
    if (!seo) return;

    // name 기반 meta 태그를 upsert (값 없으면 태그 생성 안 함 → 빈 태그 방지)
    function upsertMetaByName(name, content) {
      if (!content) return;
      var meta = document.head.querySelector('meta[name="' + name + '"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    }

    if (seo.title) {
      var titleEl = document.querySelector('title[data-page-title]') || document.querySelector('title');
      if (titleEl) titleEl.textContent = seo.title;
    }

    upsertMetaByName('description', seo.description);
    upsertMetaByName('keywords', seo.keywords);
    upsertMetaByName('naver-site-verification', seo.naverSiteVerification);
    upsertMetaByName('google-site-verification', seo.googleSiteVerification);
  };

  global.BaseDataMapper = BaseDataMapper;
})(window);
