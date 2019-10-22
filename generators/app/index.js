'use strict';
const Generator = require('yeoman-generator');
const chalk = require('chalk');
const _ = require('lodash');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const jsYaml = require('js-yaml');

// Custom helper modules.
const buildComponents = require('./build-components');
const mcLogo = require('./mc-logo');

module.exports = class extends Generator {
  prompting() {
    // Have Yeoman greet the user.
    this.log(mcLogo);

    // Proved the user with prompts.
    var prompts = [
      {
        name: 'themeName',
        message: 'What is your theme\'s human readable name?',
        default: _.startCase(this.appname) // Default to current folder name.
      },
      {
        name: 'themeNameMachine',
        message: 'What is your theme\'s machine name? EX: unicorn_theme',
        default: function (answers) {
          // Default to snake case theme name
          return _.snakeCase(answers.themeName);
        }
      },
      {
        name: 'themeDesc',
        message: 'What is your theme\'s description?',
        default: function (answers) {
          // Default to a helpful reminder to change the description later.
          // eslint-disable-next-line max-len
          return 'Update ' + answers.themeName + '.info.yml if you want to change the theme description later.';
        }
      },
      {
        type: 'list',
        name: 'whichBaseTheme',
        // eslint-disable-next-line max-len
        message: 'Which base theme would you like to use? If you don\'t want to use a base theme pick "stable" as that\'s what\'s used by Drupal if you don\'t specify a base.',
        choices: [
          {
            value: 'stable',
            name: 'Use Stable as a base theme'
          },
          {
            value: 'classy',
            name: 'Use Classy as a base theme'
          }
        ]
      },
      {
        name: 'ignoreDist',
        type: 'confirm',
        // eslint-disable-next-line max-len
        message: 'Should we update the .gitignore to ignore compiled files? (i.e. /dist)',
        default: true
      },
      {
        type: 'checkbox',
        name: 'howMuchTheme',
        message: 'Would you like any starter components with your theme?',
        // Be nice for these to be populated from an external repo
        // and use a package.json to build this list.
        choices: [
          {
            value: 'button',
            name: 'Button'
          },
          {
            value: 'tabs',
            name: 'Drupal Tabs'
          },
          {
            value: 'message',
            name: 'Drupal Messages'
          }
        ]
      }
    ];

    return this.prompt(prompts).then(function (props) {
      // props.howMuchTheme is an array of all selected options.
      // i.e. [ 'hero', 'tabs', 'messages' ]
      this.exampleComponents = props.howMuchTheme;

      // Should we ignore ./dist files or not?
      this.ignoreDist = props.ignoreDist;

      // Add the base theme to the object.
      this.baseTheme = props.whichBaseTheme;

      // Create a underscored version of the theme name.
      this.cleanThemeName = _.snakeCase(props.themeName);

      // Use the user provided theme machine name.
      this.themeNameMachine = props.themeNameMachine;

      // Create a dashed version of the theme name.
      this.dashedThemeName = _.kebabCase(props.themeName);

      // Get pkg info so we can create a 'generated on' comment.
      this.pkg = JSON.parse(
        fs.readFileSync(
          path.resolve(path.join(__dirname, '../../package.json')), 'utf8'
        )
      );

      // To access props later use this.props.someAnswer;
      this.props = props;
    }.bind(this));
  }

  configuring() {
    // If any example components were selected...
    if (this.exampleComponents.length > 0) {
      // ...copy over the example components.
      buildComponents(this.exampleComponents, this)
        .then(buildComponentsConfig => {
          // And add the needed lines to the Drupal library file.
          this.fs.copyTpl(
            this.templatePath('_theme_name.libraries.yml'),
            this.destinationPath(this.themeNameMachine + '.libraries.yml'),
            {
              themeNameMachine: this.themeNameMachine,
              exampleComponents: jsYaml.safeDump(buildComponentsConfig)
            }
          );
        })
        .catch(error => {
          // eslint-disable-next-line no-console
          console.error(error);
        });
    }
    else {
      // No example componets were selected, go ahead and copy over the default
      // Drupal libraries file without any additional libraries.
      this.fs.copyTpl(
        this.templatePath('_theme_name.libraries.yml'),
        this.destinationPath(this.themeNameMachine + '.libraries.yml'),
        {
          themeNameMachine: this.themeNameMachine,
          exampleComponents: ''
        }
      );
    }
  }

  writing() {
    // Create the project configuration.
    // This adds node modules and tools needed.
    this.fs.copyTpl(
      this.templatePath('_package.json'),
      this.destinationPath('package.json'),
      {
        themeName: this.themeNameMachine
      }
    );
    // Only ignore ./dist files if the user has selected
    // that option.
    this.fs.copyTpl(
      this.templatePath('gitignore'),
      this.destinationPath('.gitignore'),
      {
        ignoreDist: this.ignoreDist
      }
    );
    this.fs.copy(
      this.templatePath('editorconfig'),
      this.destinationPath('.editorconfig')
    );
    this.fs.copy(
      this.templatePath('prettierrc.json'),
      this.destinationPath('.prettierrc.json')
    );
    this.fs.copy(
      this.templatePath('_README.md'),
      this.destinationPath('README.md')
    );
    this.fs.copy(
      this.templatePath('eslintrc.json'),
      this.destinationPath('.eslintrc.json')
    );
    this.fs.copy(
      this.templatePath('sass-lint.yml'),
      this.destinationPath('.sass-lint.yml')
    );
    // We need the theme machine name so we can set
    // correct namespaces.
    this.fs.copyTpl(
      this.templatePath('_patternlab-config.json'),
      this.destinationPath('patternlab-config.json'),
      {
        themeNameMachine: this.themeNameMachine
      }
    );
    this.fs.copy(
      this.templatePath('_src/patterns/global'),
      this.destinationPath('src/patterns/global')
    );
    this.fs.copy(
      this.templatePath('_src/patterns/components'),
      this.destinationPath('src/patterns/components')
    );
    this.fs.copy(
      this.templatePath('_helper-components/icons'),
      this.destinationPath('src/patterns/components/icons')
    );
    this.fs.copyTpl(
      this.templatePath('_helper-components/icons/icons.md'),
      this.destinationPath('src/patterns/components/icons/icons.md'),
      {
        themeNameMachine: this.themeNameMachine
      }
    );
    this.fs.copyTpl(
      this.templatePath('_helper-components/icons/icons.twig'),
      this.destinationPath('src/patterns/components/icons/icons.twig'),
      {
        themeNameMachine: this.themeNameMachine
      }
    );
    this.fs.copyTpl(
      this.templatePath('_helper-components/icons/_icons-macro.twig'),
      this.destinationPath('src/patterns/components/icons/_icons-macro.twig'),
      {
        themeNameMachine: this.themeNameMachine
      }
    );
    this.fs.copy(
      this.templatePath('_src/patterns/layout/.gitkeep'),
      this.destinationPath('src/patterns/layout/.gitkeep')
    );
    this.fs.copy(
      this.templatePath('_patches'),
      this.destinationPath('patches')
    );
    this.fs.copy(
      this.templatePath('_src/patterns/pages/.gitkeep'),
      this.destinationPath('src/patterns/pages/.gitkeep')
    );
    this.fs.copy(
      this.templatePath('_src/styleguide'),
      this.destinationPath('src/styleguide')
    );
    this.fs.copy(
      this.templatePath('_src/templates/.gitkeep'),
      this.destinationPath('src/templates/.gitkeep')
    );
    this.fs.copy(
      this.templatePath('_src/favicon.ico'),
      this.destinationPath('src/favicon.ico')
    );

    // Build out the compiled folders.
    mkdirp('dist');
    mkdirp('dist/css');
    mkdirp('dist/fonts');
    mkdirp('dist/images');
    mkdirp('dist/js');

    // Some folders remain empty so add in a gitkeep
    // so they're checked into git.
    this.fs.copy(
      this.templatePath('gitkeep'),
      this.destinationPath('dist/css/.gitkeep')
    );
    this.fs.copy(
      this.templatePath('gitkeep'),
      this.destinationPath('dist/fonts/.gitkeep')
    );
    this.fs.copy(
      this.templatePath('gitkeep'),
      this.destinationPath('dist/images/.gitkeep')
    );
    this.fs.copy(
      this.templatePath('gitkeep'),
      this.destinationPath('dist/js/.gitkeep')
    );

    // Add build tools.
    this.fs.copy(
      this.templatePath('_gulpfile.js'),
      this.destinationPath('gulpfile.js')
    );
    this.fs.copy(
      this.templatePath('_gulp-tasks'),
      this.destinationPath('gulp-tasks')
    );

    // Create the theme files.
    //
    // Create theme.info.yml with data provided.
    this.fs.copyTpl(
      this.templatePath('_theme_name.info.yml'),
      this.destinationPath(this.themeNameMachine + '.info.yml'),
      {
        themeName: this.props.themeName,
        themeDesc: this.props.themeDesc,
        themeNameMachine: this.themeNameMachine,
        baseTheme: this.baseTheme,
        pkg: this.pkg
      }
    );
    // Create theme.breakpoints.yml with data provided.
    this.fs.copyTpl(
      this.templatePath('_theme_name.breakpoints.yml'),
      this.destinationPath(this.themeNameMachine + '.breakpoints.yml'),
      {
        themeName: this.props.themeName,
        themeNameMachine: this.themeNameMachine
      }
    );
    // Create theme.theme with data provided.
    this.fs.copyTpl(
      this.templatePath('_theme_name.theme'),
      this.destinationPath(this.themeNameMachine + '.theme'),
      {
        themeNameMachine: this.themeNameMachine
      }
    );

    // TODO: this needs to be updated for creating a new component.
    // May be able to repurpose to add example components. Would require
    // Abstracting out pieces of 'build-components'.
    //
    //   this.composeWith('mc-d8-theme:component', {
    //     arguments: ['Sample List']
    //   });

    this.fs.copy(
      this.templatePath('_screenshot.png'),
      this.destinationPath('screenshot.png')
    );
  }

  install() {
    // Install the following node modules specifically for Pattern Lab.
    // In the future we can add
    //
    // '@pattern-lab/core',
    // '@pattern-lab/engine-twig-php',
    //
    // to the list too but for now we have to set the specific
    // version in the _package.json so patch package works correctly.
    //
    // TODO: Add in pattern-lab core and engine-twig-php when those patches
    // are no longer needed.
    var npmArray = [
      '@pattern-lab/uikit-workshop',
      'patch-package'
    ];

    // This runs `npm install ... --save-dev` on the command line.
    this.npmInstall(npmArray, {
      saveDev: true
    });

    // Need to see if we still need this.
    this.npmInstall();
  }

  end() {
    this.log(chalk.cyan.bgBlack.bold(
      // eslint-disable-next-line indent
`☠️  NOTE: Your new generated theme contains a fair bit of boilerplate code.
This is by design. If you don't need it PLEASE delete it.
You can always rerun the generator some other time in a different directory
and copy over what you're missing.`));
    this.log(chalk.red('🚀'));
  }
};
