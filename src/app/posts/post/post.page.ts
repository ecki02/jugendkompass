import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WpService } from 'src/app/services/wp.service';
import { AudioService } from 'src/app/services/audio.service';
import { PhotoViewer } from '@ionic-native/photo-viewer/ngx';
import { Platform, ActionSheetController, IonButton, IonIcon, IonBackButton } from '@ionic/angular';
import { AppComponent } from 'src/app/app.component';
import { Storage } from '@ionic/storage';
import { Post } from 'src/app/utils/interfaces';
import { Plugins } from '@capacitor/core';
const { Browser, Share } = Plugins;
@Component({
  selector: 'app-post',
  templateUrl: './post.page.html',
  styleUrls: ['./post.page.scss'],
})
export class PostPage implements OnInit {

  @ViewChild('backButton', {static: false}) backButton: IonBackButton

  public post: Post;
  public sound: any;
  public soundReady = false;
  public playing = false;
  favoritePosts: Post[] = [];
  defaultHref = '';

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private wp: WpService,
    private audioService: AudioService,
    private photoViewer: PhotoViewer,
    private platform: Platform,
    private actionSheetController: ActionSheetController,
    private appComponent: AppComponent,
    private storage: Storage
  ) { }

  ngOnInit() {
    this.appComponent.getObservable().subscribe((loggedIn: boolean) => {
      if (loggedIn) {
        this.loadData();
      }
    });
  }

  async loadData() {
    this.backButton.defaultHref = this.router['routerState'].snapshot.url.search('favorites') ? 'tabs/favorites' : 'tabs/posts';
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    await this.storage.get('favoritePosts').then((res: any) => {
      if(res) this.favoritePosts = JSON.parse(res);
    });
    let isFavorite: boolean = false;
    if(this.favoritePosts) isFavorite = this.favoritePosts.find(post => post.id.toString() == id)? true : false;
    
    // if local stored favorite-post, get post information from local storage
    if (isFavorite) {
      const localPost: Post = this.favoritePosts.find(post => post.id.toString() == id); 
      this.post = {...localPost};

      if (this.post.audio) {
        this.audioService.loadNewAudio(this.post.audio, this.post.title.rendered);
      }

      if (this.platform.is('capacitor')) {

      }
      setTimeout(() => {
        for (const image of Array.from(document.querySelectorAll('.postContent img'))) {
          (image as any).onclick = () => {
            this.photoViewer.show((image as any).src);
          };
        }
      }, 100);
    }else {
      this.wp.getPostContent(id).then((res: any) => {
        this.post = {
          ...res.data,
          media_url: res.data._embedded['wp:featuredmedia'] ?
            res.data._embedded['wp:featuredmedia'][0].media_details.sizes.medium.source_url : undefined,
          isFavorite: isFavorite,
          views: res.data.views ? parseInt(res.data.views, 10) + 1 : 1
        };
  
        if (this.post.audio) {
          this.audioService.loadNewAudio(this.post.audio, this.post.title.rendered);
        }
  
        if (this.platform.is('capacitor')) {
  
        }
        setTimeout(() => {
          for (const image of Array.from(document.querySelectorAll('.postContent img'))) {
            (image as any).onclick = () => {
              this.photoViewer.show((image as any).src);
            };
          }
        }, 100);
      });
    }
  }

  async openMenu() {
    const actionButtons: any[] = [
      {
        text: 'Artikel teilen',
        handler: async () => {
          if (this.platform.is("capacitor")) {
            await Share.share({
              title: 'Artikel teilen',
              text: this.post.title.rendered,
              url: this.post.link,
              dialogTitle: 'Artikel teilen',
            });
          } else {
            window.open(this.post.link, "_blank");
          }
        },
      },
      {
        text: 'Artikel im Browser aufrufen',
        handler: async () => {
          await Browser.open({
            url: this.post.link,
          });
        },
      },
    ];

    if (this.post.pdf) {
      actionButtons.push({
        text: 'Artikel als PDF anzeigen',
        handler: async () => {
          await Browser.open({
            url: this.post.pdf,
          });
        },
      });
    }

    actionButtons.push({
      role: 'destructive',
      text: 'Abbrechen',
    });

    const sheet = await this.actionSheetController.create({
      buttons: actionButtons,
    });

    await sheet.present();
  }

  play() {
    this.audioService.playNew();
  }

  async setPostFavorite() {
    if(!this.post.isFavorite){
      this.post.isFavorite = true;
      if(this.post.media_url) await this.wp.getBase64ImgFromUrl(this.post.media_url).then(res => this.post.base64Img = res); 
      this.favoritePosts.push(this.post);
      this.storage.set('favoritePosts', JSON.stringify(this.favoritePosts));
    } else {
      this.post.isFavorite = false;
      this.favoritePosts = this.favoritePosts.filter(post => post.id != this.post.id);
      if(this.favoritePosts) this.storage.set('favoritePosts', JSON.stringify(this.favoritePosts));
    }
  }
}
