// ==UserScript==
// @name         Wayfarer RH
// @version      0.0.1
// @description  Add local review history storage to Wayfarer
// @namespace    https://github.com/tehstone/wayfarer-rh
// @downloadURL  https://github.com/tehstone/wayfarer-rh/raw/main/wayfarer-rh.user.js
// @homepageURL  https://github.com/tehstone/wayfarer-rh
// @match        https://wayfarer.nianticlabs.com/*
// ==/UserScript==

/* eslint-env es6 */
/* eslint no-var: "error" */

function init() {
  let candidate;
  let userReview;

  function getUserId() {
    var els = document.getElementsByTagName("image");
    for (var i = 0; i < els.length; i++) {
       const element = els[i];
       const attribute = element.getAttribute("href");
       let fields = attribute.split('/');
       let userId = fields[fields.length-1];
       fields = userId.split('=');
       userId = fields[0];
       return userId;
    }
    return "temporary_default_userid";
  }

  /**
   * Overwrite the open method of the XMLHttpRequest.prototype to intercept the server calls
   */
  (function (open) {
    XMLHttpRequest.prototype.open = function (method, url) {
      if (url == '/api/v1/vault/review') {
        if (method == 'GET') {
          this.addEventListener('load', parseCandidate, false);
        }
      }
      open.apply(this, arguments);
    };
  })(XMLHttpRequest.prototype.open);

  !function(send){
    XMLHttpRequest.prototype.send = function (data) {
      if (data) {
        parseReview(data);
      }
        send.call(this, data);
    }
  }(XMLHttpRequest.prototype.send);

  function parseCandidate(e) {
    try {
      const response = this.response;
      const json = JSON.parse(response);
      if (!json) {
        console.log(response);
        alert('Failed to parse response from Wayfarer');
        return;
      }
      // ignore if it's related to captchas
      if (json.captcha)
        return;

      candidate = json.result;
      if (!candidate) {
        console.log(json);
        alert('Wayfarer\'s response didn\'t include a candidate.');
        return;
      }
      saveReviewInfo();

    } catch (e) {
      console.log(e); // eslint-disable-line no-console
    }

  }

  function parseReview(data) {
    try {
      // const json = JSON.parse(request);
      // if (!json) {
      //   console.log(request);
      //   alert('Failed to parse request to Wayfarer');
      //   return;
      // }
      // // ignore if it's related to captchas
      // if (json.captcha)
      //   return;

      const userReview = JSON.parse(data);
      const type = userReview["type"];
      let edit = false;
      let photo = false;

      if (type === null) {
        return;
      } 
      if (type == "EDIT") {
        edit = true;
      }
      if (type == "PHOTO") {
        photo = true;
      }

      let reviewHistory = getReviewHistory(edit, photo);

      if (!userReview) {
        //console.log(json);
        alert('Wayfarer\'s response didn\'t include a candidate.');
        return;
      }
      const lastItem = reviewHistory.length ? reviewHistory[reviewHistory.length - 1] : null;
      const isSameReview = lastItem && lastItem.id && lastItem.id === userReview.id || false;
      if (isSameReview) {
        // update the result
        lastItem.review = userReview;
        reviewHistory[reviewHistory.length - 1] = lastItem;
      } else {
        // do nothing for now
      }
      saveUserHistory(reviewHistory, edit, photo);
      console.log(userReview);

    } catch (e) {
      console.log(e); // eslint-disable-line no-console
    }

  }

  function getReviewHistory(edit, photo) {
    let reviewHistory = [];
    const userId = getUserId();
    console.log(userId);
    let ret = "";
    if (edit) {
      ret = localStorage["wfrhSavedEdits_" + userId];
    } else if (photo) {
      ret = localStorage["wfrhSavedPhotos_" + userId];
    } else {
      ret = localStorage["wfrhSaved" + userId];
    }
    if (ret === undefined || ret === null || ret === "" || ret === "false"){
      reviewHistory = [];
    } else{
      reviewHistory = JSON.parse(ret);
    }
    return reviewHistory;
  }

  function saveUserHistory(reviewHistory, edit, photo) {
    const userId = getUserId();
    console.log(userId);
    let key = "wfrhSaved" + userId;
    let value = JSON.stringify(reviewHistory);
    if (edit) {
      key = "wfrhSavedEdits_" + userId;
    } else if (photo) {
      key = "wfrhSavedPhotos_" + userId;
    }
    try{
    //Do a simple save, this will throw an exception if the localStorage is full
      localStorage[key] = value;
    } catch (e) {
      alert("Local storage full, unable to save review history")
    }
  }

  function saveReviewInfo() {
    const ref = document.querySelector('wf-logo');

    let reviewHistory = [];
    let saveData = {};
    let edit = false;
    let photo = false;

    if (candidate.type == 'NEW') {
      const {id, title, description, lat, lng, imageUrl, statement, supportingImageUrl} = candidate;
      saveData = {
        id,
        title,
        description,
        imageUrl,
        lat,
        lng,
        statement,
        supportingImageUrl,
        ts: +new Date(),
      }
    }

    if (candidate.type == 'EDIT') {
      edit = true;
      const {id, title, description} = candidate;
      saveData = { 
        id,
        title,
        description
      }      
    }

    if (candidate.type == 'PHOTO') {
      photo = true;
      const {id, title} = candidate;
      saveData = { 
        id,
        title
      }
    }

    reviewHistory = getReviewHistory(edit, photo);

    const lastItem = reviewHistory.length ? reviewHistory[reviewHistory.length - 1] : null;
    const isSameReview = lastItem && lastItem.id && lastItem.id === saveData.id || false;
    if (!isSameReview) {
      reviewHistory.push(saveData);
    }
    
    saveUserHistory(reviewHistory, edit, photo);
  }
}

init();

