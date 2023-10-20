<?php

  require '../api/cora/setting.php';
  $setting = cora\setting::get_instance();

  // If you're already logged in
  if(isset($_COOKIE['session_key']) === true) {
    header('Location: https://app.beestat.io/');
    die();
  }

?>

<!doctype html>
<html>
  <head>
    <title>beestat</title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
    <meta name="theme-color" content="#263238">
    <style type="text/css">
      @font-face{
        font-family:"Montserrat";
        font-weight:200;
        font-style:normal;
        src:url("../font/montserrat/montserrat_200.eot?") format("embedded-opentype"),url("../font/montserrat/montserrat_200.woff") format("woff"),url("../font/montserrat/montserrat_200.ttf") format("truetype"),url("../font/montserrat/montserrat_200.svg#Montserrat") format("svg")
      }
      @font-face{
        font-family:"Montserrat";
        font-weight:300;
        font-style:normal;
        src:url("../font/montserrat/montserrat_300.eot?") format("embedded-opentype"),url("../font/montserrat/montserrat_300.woff") format("woff"),url("../font/montserrat/montserrat_300.ttf") format("truetype"),url("../font/montserrat/montserrat_300.svg#Montserrat") format("svg")
      }
      @font-face{
        font-family:"Montserrat";
        font-weight:500;
        font-style:normal;
        src:url("../font/montserrat/montserrat_500.eot?") format("embedded-opentype"),url("../font/montserrat/montserrat_500.woff") format("woff"),url("../font/montserrat/montserrat_500.ttf") format("truetype"),url("../font/montserrat/montserrat_500.svg#Montserrat") format("svg")
      }

      html {
        box-sizing: border-box;
      }

      *, *:before, *:after {
        box-sizing: inherit;
      }

      body {
        padding: 0;
        margin: 0;
        background: #2f3d44;
        font-family: Montserrat;
        overflow-x: hidden;
      }

      a {
        color: #0fb9b1;
        text-decoration: none;
        transition: color 200ms ease;
      }

      .logo {
        display: inline-block;
        vertical-align: middle;
        margin-right: 8px;
      }

      hr {
        height: 2px;
        border: none;
        background: #38474f;
      }

      /* Specific to this page. */
      header {
        padding: 20px;
      }

      main {
        background: #3bdf83;
        padding: 80px 0 80px 0;
        transform: skewY(-2deg);
        transform-origin: top left;
        margin-bottom: 48px;
      }

      .inner {
        max-width: 980px;
        padding: 0 32px 0 32px;
        margin: auto;
      }

      .main_row {
        transform: skewY(2deg);
        transform-origin: top left;
        align-items: center;
        text-align: center;
      }

      .main_text {
        color: #2f3d44;
        font-size: 19px;
        margin-bottom: 24px;
        font-weight: 500;
      }

      .about {
        line-height: 36px;
        color: #fff;
        font-size: 14px;
        font-weight: 300;
        text-align: center;
        margin-bottom: 48px;
      }

      button {
        border: none;
        font-size: 17px;
        border-radius: 3px;
        padding: 10px;
        font-family: Montserrat;
        font-weight: 300;
        display: inline-block;
        cursor: pointer;
        transition: background 200ms ease, border-color 200ms ease, color 200ms ease;
      }

      button.yellow {
        background: #fed330;
        border: 1px solid #fed330;
        color: #2f3d44;
      }

      button:hover {
        background: #20b364;
        border-color: #20b364;
        color: #fff;
      }

      @media only screen and (max-width: 470px) {
        button {
          display: block;
          width: 100%;
          margin-bottom: 24px;
        }
      }
    </style>
  </head>
  <body>
    <header>
      <img class="logo" src="../img/logo.png" height="48" alt="beestat logo"/>
    </header>
    <main>
      <div class="inner">
        <div class="main_row">
          <div class="main_text">
            Data analytics and home comparisons for your smart thermostat
          </div>
          <div>
            <a href="https://app.beestat.io/"><button class="yellow">Connect my ecobee</button></a>
          </div>
        </div>
      </div>
    </main>
    <section class="inner about">
      <hr/>
      Beestat connects with your thermostat and provides you with useful charts and analytics so that you can make informed decisions and see how changes you make lower your energy footprint.
      <hr/>
    </section>
  </body>
</html>
